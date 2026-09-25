/**
 * MNG referenceId: uppercase, unique per order.
 * @param {import('../../models/Order').default | Record<string, unknown>} order
 */
function buildMngReferenceId(order) {
    const stored = String(order.mngReferenceId || '').trim();
    if (stored) return stored.toUpperCase();

    const no = String(order.orderNumber || '').replace(/\D/g, '');
    if (no.length >= 10) return `ASTA${no}`.toUpperCase();

    const id = String(order.id || '').replace(/-/g, '').slice(0, 12);
    return `ASTA${id}`.toUpperCase();
}

/** @param {string} referenceId @param {number} piece */
function pieceBarcode(referenceId, piece = 1) {
    return `${referenceId}_P${piece}`.toUpperCase();
}

module.exports = { buildMngReferenceId, pieceBarcode };
