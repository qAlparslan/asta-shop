/** HTML şablonlarında kullanmak için ortak yardımcılar */

const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ENTITY_MAP[c]);
}

function shortOrderId(id) {
    return String(id || '').slice(0, 8).toUpperCase();
}

function money(n) {
    const v = Number(n);
    return (Number.isFinite(v) ? v : 0).toFixed(2);
}

/**
 * Sequelize JSON / string / dizi — e-posta şablonları için güvenli dizi.
 * @param {unknown} raw
 * @returns {Array<{ name?: string; quantity?: number; price?: number }>}
 */
function parseOrderItemsForEmail(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

/** @param {Record<string, unknown>} order */
function firstNameFromOrder(order) {
    return String(order?.fullName || '').split(' ')[0] || 'değerli müşterimiz';
}

/**
 * Sipariş kaydını şablonlara uygun hale getirir (items her zaman dizi).
 * @param {object} order
 */
function normalizeOrderForEmail(order) {
    const base = order && typeof order.toJSON === 'function' ? order.toJSON() : { ...order };
    return {
        ...base,
        items: parseOrderItemsForEmail(base.items),
    };
}

module.exports = {
    escapeHtml,
    shortOrderId,
    money,
    parseOrderItemsForEmail,
    firstNameFromOrder,
    normalizeOrderForEmail,
};
