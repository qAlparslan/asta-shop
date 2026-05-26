/**
 * Ödeme sonrası Paraşüt orkestrasyonu (async, kullanıcı bekletilmez).
 *
 * Adım bayrakları (.env). Bir `PARASUT_STEP_*` yazıldıysa önceliklidir; yoksa legacy anahtarlar:
 * - PARASUT_STEP_CREATE_SALES_INVOICE — satış faturası oluşturma
 * - PARASUT_STEP_CONVERT_ESTIMATE_TO_OFFICIAL — taslak → resmi (convert_to_invoice)
 * - PARASUT_STEP_RECORD_PAYMENT — tahsilat kaydı (legacy: PARASUT_RECORD_PAYMENT_*)
 * - PARASUT_STEP_EARCHIVE_TO_GIB — e-arşiv kuyruğu (legacy: PARASUT_SUBMIT_EARCHIVE_TO_GIB) + PARASUT_GIB_IRREVERSIBLE_CONFIRM=YES
 * - PARASUT_AUTO_CONVERT_WHEN_EARCHIVE — e-arşiv açıkken otomatik resmileştirme (STEP_CONVERT yokken, varsayılan true)
 *
 * Müşteri e-postası: Paraşüt swagger’da e-arşiv için doğrudan "mail gönder" alanı yok;
 * GİB süreci tamamlanınca müşteriye iletim genelde Paraşüt hesap/e-belge ayarlarına bağlıdır.
 */

const Order = require('../models/Order');
const { requireParasutConfig } = require('./parasutClient');
const { appendInvoiceError } = require('../utils/invoiceErrorLog');
const {
    singleton: parasutSingleton,
    isParasutAutomationEnabled,
    convertParasutEstimateToInvoice,
    payParasutSalesInvoice,
    createParasutEArchive,
    waitParasutTrackableJob,
    notifyAdminsOfParasutFailure,
} = require('./parasutInvoiceService');

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function truthyEnv(val) {
    const s = String(val ?? '').trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
}

/** .env içinde anahtar açıkça yazılmış mı (boş satır yazılmış sayılmaz)? */
function envHasExplicit(key) {
    const v = process.env[key];
    return v !== undefined && String(v).trim() !== '';
}

/**
 * Yeni PARASUT_STEP_* tanımlıysa onu kullanır; değilse legacy bayrakları / varsayılanı uygular.
 * @param {string} primaryKey — örn. PARASUT_STEP_CREATE_SALES_INVOICE
 * @param {() => boolean} legacyOrDefault — primaryKey .env'de yoksa çalışır
 */
function resolvePipelineStep(primaryKey, legacyOrDefault) {
    if (envHasExplicit(primaryKey)) {
        return truthyEnv(process.env[primaryKey]);
    }
    return legacyOrDefault();
}

/** Boş bırakılırsa e-arşiv sonrası job tamamlanana kadar bekle (hata ayıklamak için önerilir). */
function shouldWaitEArchiveJob() {
    const raw = process.env.PARASUT_EARCHIVE_WAIT_FOR_JOB;
    if (raw == null || String(raw).trim() === '') return true;
    return truthyEnv(raw);
}

/** Paraşüt satış faturası attributes için .env ile JSON ek alanları (ileri kullanım) */
function parseExtraInvoiceAttributesEnv() {
    const raw = String(process.env.PARASUT_EXTRA_SALES_INVOICE_ATTRIBUTES_JSON || '').trim();
    if (!raw) return {};
    try {
        const o = JSON.parse(raw);
        return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch {
        console.warn('[invoice] PARASUT_EXTRA_SALES_INVOICE_ATTRIBUTES_JSON geçersiz JSON — yok sayıldı.');
        return {};
    }
}

function buildInternetSaleAttributes() {
    const o = {
        payment_type: (process.env.PARASUT_INTERNET_SALE_PAYMENT_TYPE || 'KREDIKARTI/BANKAKARTI').trim(),
        payment_platform: (process.env.PARASUT_INTERNET_SALE_PLATFORM || 'E-ticaret').trim(),
        payment_date: todayStr(),
    };
    const site = String(process.env.FRONTEND_PUBLIC_URL || '').trim();
    if (site) o.url = site.slice(0, 500);

    const shipRaw = String(process.env.PARASUT_INTERNET_SALE_SHIPMENT_JSON || '').trim();
    if (shipRaw) {
        try {
            const ship = JSON.parse(shipRaw);
            if (ship && typeof ship === 'object' && !Array.isArray(ship)) {
                o.shipment = ship;
            }
        } catch {
            console.warn('[invoice] PARASUT_INTERNET_SALE_SHIPMENT_JSON geçersiz JSON — gönderim bilgisi eklenmedi.');
        }
    }
    return o;
}

function legacyRecordPayment() {
    return (
        truthyEnv(process.env.PARASUT_RECORD_PAYMENT_AFTER_INVOICE) ||
        truthyEnv(process.env.PARASUT_RECORD_PAYMENT)
    );
}

function stepRecordPayment() {
    return resolvePipelineStep('PARASUT_STEP_RECORD_PAYMENT', legacyRecordPayment);
}

/** Sipariş sonrası en azından bir sales_invoices kaydı oluşturulsun mu? */
function stepCreateSalesInvoice() {
    return resolvePipelineStep('PARASUT_STEP_CREATE_SALES_INVOICE', () => true);
}

/** GİB e-arşiv adımının açık/kapalı (legacy: PARASUT_SUBMIT_EARCHIVE_TO_GIB). */
function stepSubmitEArchiveToGib() {
    return resolvePipelineStep('PARASUT_STEP_EARCHIVE_TO_GIB', () =>
        truthyEnv(process.env.PARASUT_SUBMIT_EARCHIVE_TO_GIB),
    );
}

function gibIrreversibleConfirmed() {
    return String(process.env.PARASUT_GIB_IRREVERSIBLE_CONFIRM || '').trim() === 'YES';
}

/**
 * Proforma (estimate) → resmileştirme (convert_to_invoice).
 * Öncelik: PARASUT_STEP_CONVERT_ESTIMATE_TO_OFFICIAL yazıldıysa o.
 * Yoksa legacy: PARASUT_CONVERT_ESTIMATE_TO_INVOICE veya
 * (e-arşiv+GİB onayı + PARASUT_AUTO_CONVERT_WHEN_EARCHIVE, varsayılan true).
 */
function shouldConvertEstimateToInvoice(itemType) {
    if (itemType !== 'estimate') return false;

    return resolvePipelineStep('PARASUT_STEP_CONVERT_ESTIMATE_TO_OFFICIAL', () => legacyConvertEstimateToOfficial());
}

function legacyConvertEstimateToOfficial() {
    if (truthyEnv(process.env.PARASUT_CONVERT_ESTIMATE_TO_INVOICE)) return true;
    if (!stepSubmitEArchiveToGib() || !gibIrreversibleConfirmed()) return false;

    const raw = process.env.PARASUT_AUTO_CONVERT_WHEN_EARCHIVE;
    if (raw === undefined || String(raw).trim() === '') return true;
    return truthyEnv(raw);
}

/**
 * @param {string} orderId
 */
async function processPostPaymentParasut(orderId) {
    if (!isParasutAutomationEnabled()) return;

    let order;
    try {
        order = await Order.findByPk(orderId);
        if (!order || order.status === 'iptal-edildi') return;

        const cfg = requireParasutConfig();
        const companyId = cfg.companyId;

        if (!stepCreateSalesInvoice()) {
            console.log('[invoice]', orderId, 'PARASUT_STEP_CREATE_SALES_INVOICE kapalı — Paraşüt belge oluşturma atlandı.');
            return;
        }

        const itemType = (process.env.PARASUT_SALES_INVOICE_ITEM_TYPE || 'estimate').trim();
        const extraInvoiceAttributes = parseExtraInvoiceAttributesEnv();

        const inv = await parasutSingleton.createDraftSalesInvoice(order, {
            itemTypeOverride: itemType,
            extraInvoiceAttributes,
        });

        let ref = `ps:si:${inv.salesInvoiceId}`;
        const stages = ['sales_invoice'];

        if (shouldConvertEstimateToInvoice(inv.itemType)) {
            await convertParasutEstimateToInvoice(companyId, inv.salesInvoiceId);
            ref += '|conv:1';
            stages.push('convert_to_invoice');
        }

        if (stepRecordPayment()) {
            const acc = String(process.env.PARASUT_PAY_ACCOUNT_ID || '').trim();
            if (!acc) {
                throw new Error(
                    'Paraşüt tahsilat kaydı için PARASUT_PAY_ACCOUNT_ID zorunludur (kasa/banka hesap ID). PARASUT_STEP_RECORD_PAYMENT veya PARASUT_RECORD_PAYMENT_AFTER_INVOICE / PARASUT_RECORD_PAYMENT kapatın veya ID girin.',
                );
            }
            await payParasutSalesInvoice(companyId, inv.salesInvoiceId, {
                accountId: acc,
                amount: Number(order.totalAmount),
                dateStr: todayStr(),
            });
            ref += '|pay:ok';
            stages.push('payment');
        }

        const wantEarchive = stepSubmitEArchiveToGib();
        if (wantEarchive && gibIrreversibleConfirmed()) {
            const internetSale = buildInternetSaleAttributes();
            const ea = await createParasutEArchive(companyId, inv.salesInvoiceId, internetSale);
            ref += `|ej:${ea.jobId}`;
            stages.push('e_archive_job_started');

            if (shouldWaitEArchiveJob()) {
                await waitParasutTrackableJob(companyId, ea.jobId);
                ref += '|gib:done';
                stages.push('e_archive_job_done');
            }
        } else if (wantEarchive && !gibIrreversibleConfirmed()) {
            console.warn(
                '[invoice] E-arşiv adımı açık görünüyor fakat PARASUT_GIB_IRREVERSIBLE_CONFIRM=YES yazılmadı — GİB iletimi atlandı.',
            );
        }

        await order.update({
            eInvoiceIntegrationRef: ref.slice(0, 160),
            eInvoiceLastError: null,
        });

        console.log('[invoice]', orderId, 'Paraşüt:', stages.join(' → '), ref);
    } catch (e) {
        const msg = e?.message || String(e);
        await appendInvoiceError({
            stage: 'post_payment_parasut',
            orderId,
            message: msg,
            detail: e?.stack,
        });
        console.error('[invoice]', orderId, 'Paraşüt pipeline:', msg);

        try {
            const fresh = await Order.findByPk(orderId);
            if (fresh) {
                await notifyAdminsOfParasutFailure(fresh, e);
                await fresh
                    .update({
                        eInvoiceLastError: `Paraşüt: ${msg}`.slice(0, 2000),
                    })
                    .catch(() => {});
            }
        } catch (inner) {
            console.error('[invoice] bildirim/DB yazısı:', inner?.message || inner);
        }
    }
}

/**
 * Ödeme başarısından sonra arka plan işi sıraya alır (bloklamaz).
 * @param {string} orderId
 */
function enqueuePostPaymentInvoicing(orderId) {
    const id = String(orderId || '');
    if (!id || !isParasutAutomationEnabled()) return;

    setImmediate(() => {
        processPostPaymentParasut(id).catch((err) => {
            appendInvoiceError({
                stage: 'enqueue_fallback',
                orderId: id,
                message: err?.message || String(err),
                detail: err?.stack,
            }).catch(() => {});
            console.error('enqueuePostPaymentInvoicing:', id, err?.message || err);
        });
    });
}

module.exports = {
    processPostPaymentParasut,
    enqueuePostPaymentInvoicing,
};
