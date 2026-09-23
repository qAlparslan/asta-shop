const {
    formatPaytrReturnAmount,
    readPaytrCredentials,
    requestPaytrRefund,
} = require('./paytrRefundApi');
const { uuidToMerchantOid } = require('../utils/paytrMerchantOid');

function isPaytrRefundOnCancelEnabled() {
    const v = String(process.env.PAYTR_REFUND_ON_CANCEL || 'true').trim().toLowerCase();
    return !(v === '0' || v === 'false' || v === 'no');
}

function orderRefundedAmount(order) {
    const n = Number(order.refundedAmount);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function remainingRefundableAmount(order) {
    const total = Number(order.totalAmount);
    if (!Number.isFinite(total) || total <= 0) return 0;
    const rem = Math.round((total - orderRefundedAmount(order) + Number.EPSILON) * 100) / 100;
    return rem > 0 ? rem : 0;
}

/**
 * Ödemesi alınmış sipariş için PayTR iade API (tam kalan tutar).
 * @param {import('../models/Order')} order Sequelize order instance / plain
 * @param {{ referenceNo?: string; reason?: string }} [opts]
 */
async function ensurePaytrRefundForPaidOrder(order, opts = {}) {
    const refundStatus = String(order.refundStatus || 'none').trim();

    if (refundStatus === 'completed') {
        return {
            ok: true,
            applied: false,
            skipped: true,
            reason: 'already_completed',
        };
    }

    if (!isPaytrRefundOnCancelEnabled()) {
        return {
            ok: false,
            applied: false,
            error:
                'Otomatik PayTR iadesi kapalı (PAYTR_REFUND_ON_CANCEL). İptal için yönetici panelinden manuel iade gerekir.',
        };
    }

    const cred = readPaytrCredentials();
    if (!cred.merchant_id || !cred.merchant_key || !cred.merchant_salt) {
        return {
            ok: false,
            applied: false,
            error: 'PayTR iade yapılandırması eksik. Mağaza panelinden iade veya PAYTR_* ortam değişkenlerini kontrol edin.',
        };
    }

    const remaining = remainingRefundableAmount(order);
    if (remaining <= 0) {
        return {
            ok: true,
            applied: false,
            skipped: true,
            reason: 'nothing_to_refund',
        };
    }

    let return_amount;
    try {
        return_amount = formatPaytrReturnAmount(remaining);
    } catch (e) {
        return { ok: false, applied: false, error: e.message || 'Geçersiz iade tutarı.' };
    }

    const merchant_oid = uuidToMerchantOid(order.id);
    const baseRef = uuidToMerchantOid(order.id).slice(0, 48);
    const referenceNo =
        (opts.referenceNo && String(opts.referenceNo).trim().slice(0, 64)) ||
        `cncl-${baseRef}`.slice(0, 64);

    const result = await requestPaytrRefund({
        merchant_oid,
        return_amount,
        reference_no: referenceNo,
    });

    if (!result.ok) {
        return {
            ok: false,
            applied: false,
            error: result.error || 'PayTR iade başarısız.',
            err_no: result.err_no,
            paytrResponse: result.json,
        };
    }

    const refundedNow = Number(result.return_amount || return_amount);
    const newTotalRefunded = Math.round((orderRefundedAmount(order) + refundedNow + Number.EPSILON) * 100) / 100;

    return {
        ok: true,
        applied: true,
        skipped: false,
        return_amount: return_amount,
        refundedAmount: newTotalRefunded,
        paytrRefundReference: result.reference_no || referenceNo,
        is_test: result.is_test,
        paytrResponse: result.json,
    };
}

module.exports = {
    isPaytrRefundOnCancelEnabled,
    remainingRefundableAmount,
    ensurePaytrRefundForPaidOrder,
};
