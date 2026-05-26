/**
 * Checkout gövdesi için ortak doğrulama (PayTR ödeme isteğine geçmeden önce).
 */

/** @param {unknown} raw */
function normalizeCouponCode(raw) {
    if (raw == null || String(raw).trim() === '') return null;
    return String(raw).trim().toUpperCase();
}

/**
 * @param {{ fullName?: unknown; phone?: unknown }} p
 */
function validateCheckoutCustomer(p) {
    const name = String(p?.fullName || '').trim();
    if (name.length < 4) {
        throw new Error('Ad ve soyadı eksiksiz girin.');
    }
    const d = String(p?.phone || '').replace(/\D/g, '');
    if (!/^05\d{9}$/.test(d)) {
        throw new Error('Geçerli cep telefonu gerekli (11 hane, 05 ile başlar).');
    }
}

module.exports = { normalizeCouponCode, validateCheckoutCustomer };
