const { createPendingOrderInTransaction } = require('../services/checkoutOrderService');
const { releaseOrderInventory } = require('../services/orderInventory');
const { commitOrderInventory } = require('../services/orderInventory');
const Order = require('../models/Order');
const sequelize = require('../config/database');
const { getFrontendUrl } = require('../services/mailer');
const {
    sendOrderConfirmationEmail,
    sendAdminNewOrderEmail,
} = require('../services/orderEmailService');
const { buildPaytrUserBasketBase64FromOrder } = require('../utils/paytrBasket');
const {
    computePaytrGetTokenHmacBase64,
    computePaytrNotificationHmacBase64,
    timingSafeEqualBase64,
    parsePaytrTestMode,
    parsePaytrDebugOn,
    postPaytrGetToken,
    paytrIframeSrc,
} = require('../services/paytrIframeApi');

function getClientIp(req) {
    const xf = req.headers['x-forwarded-for'];
    if (xf && typeof xf === 'string') {
        const first = xf.split(',')[0].trim();
        if (first) return first.slice(0, 39);
    }
    const raw = req.ip || (req.socket && req.socket.remoteAddress) || '';
    return String(raw || '').replace(/^::ffff:/, '').slice(0, 39);
}

function uuidToMerchantOid(uuid) {
    return String(uuid || '').replace(/-/g, '');
}

/** PayTR merchant_oid geri sipariş UUID’sine (@param alphanumeric 32 karakter HEX) */
function merchantOidToOrderId(merchantOid) {
    const s = String(merchantOid || '').trim();
    if (/^[0-9a-f]{32}$/i.test(s)) {
        return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
    }
    return s;
}

/** PayTR dökümanda TL ↔ TRY kullanılabiliyor; karşılaştırmayı tek biçeme indirger */
function paytrCanonCurrency(code) {
    const c = String(code || '').trim().toUpperCase();
    return c === 'TRY' ? 'TL' : c || 'TL';
}

function orderMinorFromTotal(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return NaN;
    return Math.round((n + Number.EPSILON) * 100);
}

function readPaytrCredentials() {
    const merchant_id = String(process.env.PAYTR_MERCHANT_ID || '').trim();
    const merchant_key = String(process.env.PAYTR_MERCHANT_KEY || '').trim();
    const merchant_salt = String(process.env.PAYTR_MERCHANT_SALT || '').trim();
    return { merchant_id, merchant_key, merchant_salt };
}

function paytrCallbackAbsoluteUrlHint() {
    const base =
        String(process.env.BACKEND_PUBLIC_URL || '')
            .trim()
            .replace(/\/+$/, '')
        || String(process.env.API_PUBLIC_URL || '')
            .trim()
            .replace(/\/+$/, '');
    return base ? `${base}/api/payments/paytr-notification` : '(BACKEND_PUBLIC_URL)/api/payments/paytr-notification';
}

async function cancelPendingOrderCleanup(orderId) {
    const tx = await sequelize.transaction();
    try {
        const pending = await Order.findByPk(orderId, { transaction: tx, lock: tx.LOCK.UPDATE });
        if (pending && pending.status === 'odeme_bekleniyor') {
            await releaseOrderInventory(pending, tx);
            await pending.update({ status: 'iptal-edildi' }, { transaction: tx });
        }
        await tx.commit();
    } catch (e) {
        await tx.rollback();
        console.error('cancelPendingOrderCleanup (paytr)', orderId, e.message);
    }
}

function buildMerchantLandingUrls(orderId) {
    const base = (getFrontendUrl() || '').trim().replace(/\/+$/, '');
    if (!base || !/^https?:\/\//i.test(base)) return { merchant_ok_url: '', merchant_fail_url: '' };
    const enc = encodeURIComponent(orderId);
    return {
        merchant_ok_url: `${base}/odeme/basarili?orderId=${enc}`,
        merchant_fail_url: `${base}/odeme/hatali?reason=${encodeURIComponent('paytr_odeme_red')}&orderId=${enc}`,
    };
}

/**
 * POST /api/payments/create-payment — PAYMENT_GATEWAY=paytr
 */
exports.createPaytrPaymentInitialize = async (req, res) => {
    const cred = readPaytrCredentials();
    if (!cred.merchant_id || !cred.merchant_key || !cred.merchant_salt) {
        return res.status(500).json({
            status: 'fail',
            message:
                'PayTR yapılandırması eksik: PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT ortam değişkenlerini ayarlayın.',
        });
    }

    let committedOrderId = null;

    try {
        const t = await sequelize.transaction();
        try {
            const order = await createPendingOrderInTransaction(req, t);
            await t.commit();
            committedOrderId = order.id;
        } catch (e) {
            await t.rollback();
            return res.status(400).json({ status: 'fail', message: e.message || 'Sepet oluşturulamadı.' });
        }

        const orderRow = await Order.findByPk(committedOrderId);
        if (!orderRow) {
            return res.status(500).json({ status: 'fail', message: 'Sipariş kaydı oluşturulamadı.' });
        }

        const ojson = orderRow.toJSON();
        let user_basket;
        try {
            user_basket = await buildPaytrUserBasketBase64FromOrder(ojson);
        } catch (basketErr) {
            console.error('PayTR sepet derleme:', basketErr);
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(400).json({
                status: 'fail',
                message: basketErr.message || 'Ödeme sepeti oluşturulamadı.',
            });
        }

        const paymentMinor = orderMinorFromTotal(ojson.totalAmount);
        if (!Number.isFinite(paymentMinor) || paymentMinor < 1) {
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(400).json({ status: 'fail', message: 'Geçersiz sipariş tutarı.' });
        }

        const merchant_oid = uuidToMerchantOid(ojson.id);
        if (!/^[0-9a-zA-Z]+$/.test(merchant_oid) || merchant_oid.length > 64) {
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(500).json({ status: 'fail', message: 'Sipariş numarası PayTR için uygun değil.' });
        }

        const urls = buildMerchantLandingUrls(orderRow.id);
        if (!urls.merchant_ok_url || !urls.merchant_fail_url) {
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(500).json({
                status: 'fail',
                message: `Ödeme dönüş adresi için FRONTEND_PUBLIC_URL (veya FRONTEND_ORIGINS) HTTPS/HTTP tam kök olarak ayarlanmalıdır. PayTR bildirim URL panelini şu ada göre kaydedin: ${paytrCallbackAbsoluteUrlHint()}`,
            });
        }

        const user_ip = getClientIp(req) || process.env.PAYTR_DEV_USER_IP_OVERRIDE || '';
        if (!user_ip || user_ip === '127.0.0.1' || user_ip === '::1') {
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(400).json({
                status: 'fail',
                message:
                    'PayTR, geçerli bir kullanıcı IP adresi gerektirir. reverse proxy arkasında çalışıyorsanız TRUST_PROXY=true ve X-Forwarded-For doğrulanmalı; geliştirme için PAYTR_DEV_USER_IP_OVERRIDE ile dış IP verilebilir.',
            });
        }

        const currency = String(process.env.PAYTR_CURRENCY || 'TL').trim() || 'TL';
        const test_mode = parsePaytrTestMode();
        const debug_on = parsePaytrDebugOn();
        const no_installment = String(process.env.PAYTR_NO_INSTALLMENT === 'true' ? 1 : 0);
        const max_installment =
            process.env.PAYTR_MAX_INSTALLMENT != null && String(process.env.PAYTR_MAX_INSTALLMENT).trim()
                ? String(Math.min(12, Math.max(0, parseInt(process.env.PAYTR_MAX_INSTALLMENT, 10) || 0)))
                : '0';

        const paytr_token = computePaytrGetTokenHmacBase64(
            { merchantId: cred.merchant_id, merchantKey: cred.merchant_key, merchantSalt: cred.merchant_salt },
            {
                user_ip,
                merchant_oid,
                email: String(ojson.email || '').trim().slice(0, 100),
                payment_amount: String(paymentMinor),
                user_basket,
                no_installment,
                max_installment,
                currency,
                test_mode,
            },
        );

        const user_name = String(ojson.fullName || '').trim().slice(0, 60);
        const user_addressParts = [
            String(req.body?.province ?? '').trim(),
            String(req.body?.district ?? '').trim(),
            String(ojson.address ?? '').trim(),
        ].filter(Boolean);
        const user_address = user_addressParts.join(' ').slice(0, 400);
        const user_phone = String(ojson.phone ?? '')
            .replace(/\D/g, '')
            .slice(0, 20);

        const formData = {
            merchant_id: cred.merchant_id,
            user_ip,
            merchant_oid,
            email: String(ojson.email || '').trim().slice(0, 100),
            payment_amount: String(paymentMinor),
            /**
             * Not: Dokümantasyondaki Node örneği gereksiz yere merchant_key/salt iletiyor — PayTR’nin PHP örneği
             * doğru modeldir; sırlar iletilmez.
             */
            paytr_token,
            user_basket,
            debug_on,
            no_installment,
            max_installment,
            user_name,
            user_address,
            user_phone: user_phone || '05000000000',
            merchant_ok_url: urls.merchant_ok_url.slice(0, 400),
            merchant_fail_url: urls.merchant_fail_url.slice(0, 400),
            timeout_limit: String(Number(process.env.PENDING_ORDER_TIMEOUT_MINUTES || 30) || 30),
            currency,
            test_mode,
        };
        const langVal = String(process.env.PAYTR_LANG ?? 'tr').trim();
        if (langVal) formData.lang = langVal;

        let tokenResult;
        try {
            tokenResult = await postPaytrGetToken(formData);
        } catch (err) {
            console.error('PayTR get-token HTTP:', err.message);
            await cancelPendingOrderCleanup(committedOrderId);
            return res.status(502).json({ status: 'fail', message: 'Ödeme sağlayıcısına bağlanılamadı.' });
        }

        const jr = tokenResult.json;
        if (!jr || String(jr.status).toLowerCase() !== 'success' || !jr.token) {
            console.error('PayTR get-token reddi:', jr || tokenResult.raw);
            await cancelPendingOrderCleanup(committedOrderId);
            const reason =
                typeof jr?.reason === 'string' ? jr.reason : typeof jr?.err_msg === 'string' ? jr.err_msg : 'token_alinamadi';
            return res.status(502).json({ status: 'fail', message: `PayTR token alınamadı: ${reason}` });
        }

        const iframeToken = String(jr.token).trim();
        const paytrIframeUrl = paytrIframeSrc(iframeToken);

        return res.status(201).json({
            status: 'success',
            data: {
                paymentGateway: 'paytr',
                conversationId: orderRow.id,
                paytrIframeToken: iframeToken,
                paytrIframeUrl,
                /** Mağaza panelinde Bildirim URL’si olarak kaydedeceğiniz adres (HTTPS önerilir) */
                paytrNotificationCallbackUrlHint: paytrCallbackAbsoluteUrlHint(),
                /** PayTR uyarısı: sipariş onayı yalnızca bildirimde yapılmalıdır; bu adresler müşteri bilgilendirir */
                merchantOkUsedForDisplayOnly: true,
            },
        });
    } catch (err) {
        if (committedOrderId) await cancelPendingOrderCleanup(committedOrderId);
        console.error('createPaytrPaymentInitialize:', err);
        return res.status(500).json({ status: 'fail', message: err.message || 'Sunucu hatası.' });
    }
};

/**
 * Bildirim URL — PAYTR iframe 2. adım — yanıt düz metin "OK".
 * Ortamınız için mutlak adres: PAYTR bildirimi mağaza panelinden girilir (.env uyarısı yukarıdaki helper).
 *
 * Güvenlik: hash doğrulanır (PHP 2. adım); tutarda total_amount ile sipariş alt sınırı; payment_amount dokümana göre takside göre sapabilir.
 */
exports.handlePaytrNotification = async (req, res) => {
    const cred = readPaytrCredentials();

    /** Bildirimin PayTR tarafından alındığına dair yanıt — yanıt düz yazı olmalı, OK dışında HTML basılmamalıdır. */
    const sendPlainOk = () => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send('OK');
    };

    const sendFailPlain = (httpCode, msg) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        /** Dokümana göre yanlış hash / şüpheli istek için OK gönderilmemeli (PHP örnekleri die / throw). */
        return res.status(httpCode).send(msg);
    };

    const sourceIp = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    console.log('[paytr] bildirim ALINDI', {
        ip: sourceIp,
        merchant_oid: body.merchant_oid,
        status: body.status,
        total_amount: body.total_amount,
        payment_type: body.payment_type,
        failed_reason_code: body.failed_reason_code,
        failed_reason_msg: body.failed_reason_msg,
    });

    if (!cred.merchant_id || !cred.merchant_key || !cred.merchant_salt) {
        console.error('[paytr] bildirim: yapılandırma eksik');
        return sendFailPlain(500, 'merchant config missing');
    }

    const merchant_oid = String(body.merchant_oid ?? '').trim();
    const statusRaw = String(body.status ?? '').trim();
    const total_amount = String(body.total_amount ?? '').trim();
    const incomingHash = String(body.hash ?? '').trim();
    const payment_amountPosted = body.payment_amount != null ? String(body.payment_amount).trim() : '';

    /** Hash oluşturmak için zorunlu alanlar (2. Adım dokümantasyon tablosu). payment_amount hash’te yoktur. */
    if (!merchant_oid || !statusRaw || !total_amount || !incomingHash) {
        console.warn('[paytr] bildirim: hash için zorunlu alan eksik', {
            merchant_oid, statusRaw, total_amount, incomingHash_len: incomingHash.length,
        });
        return sendFailPlain(400, 'PAYTR notification failed: missing parameters');
    }

    let expectedHash;
    try {
        expectedHash = computePaytrNotificationHmacBase64(
            { merchantKey: cred.merchant_key, merchantSalt: cred.merchant_salt },
            {
                merchant_oid,
                status: statusRaw,
                total_amount,
            },
        );
    } catch (hmacErr) {
        console.error('[paytr] bildirim: hash üretilemedi', hmacErr.message);
        return sendFailPlain(500, 'merchant config invalid');
    }
    if (!timingSafeEqualBase64(expectedHash, incomingHash)) {
        console.error('[paytr] bildirim: hash doğrulanamadı — OK gönderilmiyor', {
            merchant_oid, status: statusRaw, total_amount,
        });
        return sendFailPlain(400, 'PAYTR notification failed: bad hash');
    }

        const orderId = merchantOidToOrderId(merchant_oid);
    console.log('[paytr] bildirim: hash OK, sipariş aranıyor', { merchant_oid, orderId, status: statusRaw });
    try {
        const tx = await sequelize.transaction();
        const fresh = await Order.findByPk(orderId, { transaction: tx, lock: tx.LOCK.UPDATE });
        if (!fresh) {
            await tx.commit();
            console.warn('[paytr] bildirim: sipariş yok', orderId);
            return sendPlainOk();
        }

        /** Zaten sonuçlanmış sipariş (tekrarlayan bildirim) — yalnızca OK */
        if (fresh.status !== 'odeme_bekleniyor') {
            await tx.commit();
            console.log('[paytr] bildirim: sipariş zaten işlenmiş, OK', { orderId, status: fresh.status });
            return sendPlainOk();
        }

        const orderMinorExpected = orderMinorFromTotal(fresh.totalAmount);

        /** Tahsil tutarı (kurus): vade/taksit farkı dahil bildirilmiş tutar; dokümana göre muhasebe için total_amount esaslıdır */
        const totalIncomingMinor = parseInt(total_amount, 10);
        if (!Number.isFinite(totalIncomingMinor) || totalIncomingMinor < orderMinorExpected) {
            await tx.commit();
            console.error('[paytr] bildirim: total_amount sipariş tutarından küçük veya geçersiz', {
                siparis: fresh.id,
                beklenenEnAz: orderMinorExpected,
                total_amount,
                payment_amount: payment_amountPosted,
            });
            return sendPlainOk();
        }

        if (payment_amountPosted !== '') {
            const pam = parseInt(payment_amountPosted, 10);
            if (!Number.isFinite(pam)) {
                await tx.commit();
                console.error('[paytr] bildirim: payment_amount sayı olarak okunamadı', payment_amountPosted);
                return sendPlainOk();
            }
            /**
             * 2. Adım dok.: taksitli işlemlerde 1. adımdaki payment_amount ile bildirimde gelen tutar uyumsuz olabilir,
             * güncel tahsil total_amount ile takip edilmelidir. Burada sıkı eşlik zorlamıyoruz; uyumsuzlukta uyarı yazarız.
             */
            if (pam !== orderMinorExpected && pam !== totalIncomingMinor) {
                console.warn('[paytr] bildirim: payment_amount (', pam, '), sipariş (', orderMinorExpected, '), total (',
                    totalIncomingMinor, ') farklı — PayTR bildirimi kabul işlemi sürdü');
            }
        } else {
            console.warn('[paytr] bildirim: payment_amount alanı gönderilmemiş; total_amount ile doğrulandı');
        }

        const payment_typePosted = String(body.payment_type ?? '').trim();
        if (!payment_typePosted) {
            console.warn('[paytr] bildirim: payment_type boş — dokümanda bildirilir; PayTR güncellenmesinde kontrol edin');
        }

        const statusLc = statusRaw.toLowerCase();
        if (statusLc === 'success') {
            const configuredCur = paytrCanonCurrency(process.env.PAYTR_CURRENCY);
            const curPostedRaw = String(body.currency ?? '').trim().toUpperCase();
            if (curPostedRaw && paytrCanonCurrency(curPostedRaw) !== configuredCur) {
                await tx.commit();
                console.warn('[paytr] bildirim: currency beklenen (1.Adım PAYTR_CURRENCY) ile uyumsuz, onay atlanıyor', {
                    beklenen: configuredCur,
                    gelen: curPostedRaw,
                    siparis: fresh.id,
                });
                return sendPlainOk();
            }

            await commitOrderInventory(fresh, tx);
            await fresh.update(
                {
                    status: 'hazirlaniyor',
                    eInvoiceStatus: fresh.wantsElectronicInvoice ? 'awaiting_integration' : 'none',
                    eInvoiceLastError: null,
                },
                { transaction: tx },
            );
            await tx.commit();

            const snap = fresh.toJSON ? fresh.toJSON() : fresh;
            await sendOrderConfirmationEmail(snap);
            await sendAdminNewOrderEmail(snap);
            console.log('PayTR ödeme tamamlandı:', snap.id, payment_typePosted ? `[${payment_typePosted}]` : '');
            return sendPlainOk();
        }

        /**
         * status !== success (dokümanda başarısız bildirimi; dokümana göre echo OK ve iptal süreçleri).
         */
        await releaseOrderInventory(fresh, tx);
        await fresh.update({ status: 'iptal-edildi' }, { transaction: tx });
        await tx.commit();
        console.warn('PayTR ödeme iptal/red:', fresh.id, body.failed_reason_code, body.failed_reason_msg);
        return sendPlainOk();
    } catch (e) {
        console.error('handlePaytrNotification:', e.message);
        return sendFailPlain(500, 'server error');
    }
};
