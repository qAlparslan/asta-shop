const crypto = require('crypto');

const PAYTR_REFUND_URL = 'https://www.paytr.com/odeme/iade';

function readPaytrCredentials() {
    const merchant_id = String(process.env.PAYTR_MERCHANT_ID || '').trim();
    const merchant_key = String(process.env.PAYTR_MERCHANT_KEY || '').trim();
    const merchant_salt = String(process.env.PAYTR_MERCHANT_SALT || '').trim();
    return { merchant_id, merchant_key, merchant_salt };
}

/**
 * İade API token — dev.paytr.com/iade-api
 * hash_str = merchant_id + merchant_oid + return_amount + merchant_salt
 */
function computePaytrRefundToken({ merchantId, merchantKey, merchantSalt }, { merchant_oid, return_amount }) {
    const hashStr = `${merchantId}${merchant_oid}${return_amount}${merchantSalt}`;
    return crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');
}

/**
 * PayTR iade tutarı: TL, ondalık ayraç nokta (iframe kuruş formatından farklı).
 * @param {number|string} amount
 */
/** PayTR: reference_no yalnızca alfanumerik (tire/özel karakter yok). */
function sanitizePaytrReferenceNo(raw, fallbackAlphanumeric) {
    const cleaned = String(raw || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 64);
    if (cleaned.length > 0) return cleaned;
    const fb = String(fallbackAlphanumeric || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 64);
    return fb || 'ref';
}

function formatPaytrReturnAmount(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error('Geçersiz iade tutarı.');
    }
    return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * @param {{ merchant_oid: string; return_amount: string; reference_no?: string }} params
 */
async function requestPaytrRefund(params) {
    const cred = readPaytrCredentials();
    if (!cred.merchant_id || !cred.merchant_key || !cred.merchant_salt) {
        return {
            ok: false,
            httpStatus: 0,
            error: 'PayTR yapılandırması eksik (PAYTR_MERCHANT_ID/KEY/SALT).',
            json: null,
        };
    }

    const merchant_oid = String(params.merchant_oid || '').trim();
    const return_amount = String(params.return_amount || '').trim();
    if (!merchant_oid || !return_amount) {
        return { ok: false, httpStatus: 0, error: 'merchant_oid ve return_amount zorunlu.', json: null };
    }

    const paytr_token = computePaytrRefundToken(
        {
            merchantId: cred.merchant_id,
            merchantKey: cred.merchant_key,
            merchantSalt: cred.merchant_salt,
        },
        { merchant_oid, return_amount },
    );

    const body = new URLSearchParams();
    body.set('merchant_id', cred.merchant_id);
    body.set('merchant_oid', merchant_oid);
    body.set('return_amount', return_amount);
    body.set('paytr_token', paytr_token);
    if (params.reference_no) {
        body.set(
            'reference_no',
            sanitizePaytrReferenceNo(params.reference_no, params.merchant_oid),
        );
    }

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25000);

    let res;
    try {
        res = await fetch(PAYTR_REFUND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: body.toString(),
            signal: ac.signal,
        });
    } catch (e) {
        const msg =
            e && e.name === 'AbortError'
                ? 'PayTR iade isteği zaman aşımına uğradı (25 sn).'
                : e.message || 'PayTR iade bağlantı hatası.';
        return { ok: false, httpStatus: 0, error: msg, json: null };
    } finally {
        clearTimeout(timer);
    }

    const text = await res.text();
    /** @type {Record<string, unknown> | null} */
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        return {
            ok: false,
            httpStatus: res.status,
            error: `PayTR iade geçersiz yanıt (${res.status}).`,
            json: { raw: text },
        };
    }

    const status = String(json?.status || '').toLowerCase();
    if (status === 'success') {
        return {
            ok: true,
            httpStatus: res.status,
            error: null,
            json,
            return_amount: String(json.return_amount || return_amount),
            reference_no: json.reference_no != null ? String(json.reference_no) : params.reference_no || null,
            is_test: json.is_test,
        };
    }

    const errMsg =
        (typeof json?.err_msg === 'string' && json.err_msg.trim()) ||
        (typeof json?.reason === 'string' && json.reason.trim()) ||
        'PayTR iade talebi reddedildi.';
    return {
        ok: false,
        httpStatus: res.status,
        error: errMsg,
        err_no: json?.err_no,
        json,
    };
}

module.exports = {
    PAYTR_REFUND_URL,
    readPaytrCredentials,
    computePaytrRefundToken,
    sanitizePaytrReferenceNo,
    formatPaytrReturnAmount,
    requestPaytrRefund,
};
