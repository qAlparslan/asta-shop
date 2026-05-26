const crypto = require('crypto');

const PAYTR_GET_TOKEN_URL = 'https://www.paytr.com/odeme/api/get-token';

/**
 * PayTR iFrame 1. Adım — paytr_token
 * Kaynak: https://dev.paytr.com/iframe-api/iframe-api-1-adim
 * hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
 *            + no_installment + max_installment + currency + test_mode
 * paytr_token = base64( HMAC_SHA256( merchant_key, hash_str + merchant_salt ) )
 */
function computePaytrGetTokenHmacBase64(
    { merchantId, merchantKey, merchantSalt },
    {
        user_ip,
        merchant_oid,
        email,
        payment_amount,
        user_basket,
        no_installment,
        max_installment,
        currency,
        test_mode,
    },
) {
    const hashStr = `${merchantId}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
    return crypto.createHmac('sha256', merchantKey).update(hashStr + merchantSalt).digest('base64');
}

/**
 * PayTR iFrame 2. Adım — bildirim hash (PHP ile aynı: veri dizisi düz birleştirme, anahtar merchant_key).
 * Örnek: https://dev.paytr.com/iframe-api/iframe-api-2-adim
 * PHP: hash_hmac('sha256', merchant_oid.merchant_salt.status.total_amount, merchant_key, true) → base64
 */
function computePaytrNotificationHmacBase64({ merchantKey, merchantSalt }, { merchant_oid, status, total_amount }) {
    const key = String(merchantKey || '').trim();
    const salt = String(merchantSalt || '').trim();
    if (!key || !salt) {
        throw new Error('paytr_hmac_missing_credentials');
    }
    const payload = `${merchant_oid}${salt}${status}${total_amount}`;
    return crypto.createHmac('sha256', key).update(payload).digest('base64');
}

function timingSafeEqualBase64(a, b) {
    const x = Buffer.from(String(a || ''), 'utf8');
    const y = Buffer.from(String(b || ''), 'utf8');
    if (x.length !== y.length) return false;
    return crypto.timingSafeEqual(x, y);
}

function parsePaytrTestMode() {
    const v = String(process.env.PAYTR_TEST_MODE || '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' ? '1' : '0';
}

function parsePaytrDebugOn() {
    const v = String(process.env.PAYTR_DEBUG_ON || '').trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes') return '1';
    if (process.env.NODE_ENV !== 'production') return '1';
    return '0';
}

/**
 * @param {Record<string, string | number>} formFields — application/x-www-form-urlencoded alanları
 */
async function postPaytrGetToken(formFields) {
    const body = new URLSearchParams();
    for (const [k, val] of Object.entries(formFields)) {
        if (val === undefined || val === null) continue;
        body.set(k, String(val));
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);

    let res;
    try {
        res = await fetch(PAYTR_GET_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: body.toString(),
            signal: ac.signal,
        });
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new Error('PayTR get-token zaman aşımı (20 sn)');
        }
        throw e;
    } finally {
        clearTimeout(t);
    }

    const text = await res.text();
    let json;
    try {
        json = JSON.parse(text);
    } catch {
        throw new Error(`PayTR get-token geçersiz JSON yanıtı (${res.status})`);
    }
    return { httpStatus: res.status, json, raw: text };
}

function paytrIframeSrc(token) {
    const t = String(token || '').trim();
    if (!t) return '';
    return `https://www.paytr.com/odeme/guvenli/${t}`;
}

module.exports = {
    PAYTR_GET_TOKEN_URL,
    computePaytrGetTokenHmacBase64,
    computePaytrNotificationHmacBase64,
    timingSafeEqualBase64,
    parsePaytrTestMode,
    parsePaytrDebugOn,
    postPaytrGetToken,
    paytrIframeSrc,
};
