/**
 * Kargo firmasına göre kamuya açık takip URL'i.
 * @param {string | null | undefined} carrier
 * @param {string | null | undefined} trackingNumber
 * @returns {string | null}
 */
function buildPublicTrackingUrl(carrier, trackingNumber) {
    const no = String(trackingNumber || '').trim();
    if (!no) return null;

    const c = String(carrier || 'DHL').trim().toUpperCase();
    if (c === 'DHL' || c === 'DHL_EXPRESS') {
        return `https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=${encodeURIComponent(no)}`;
    }
    return null;
}

/**
 * DHL ham durumunu müşteri arayüzü için kısa Türkçe etiket.
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
function trackingStatusLabelTr(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return null;
    if (s.includes('deliver')) return 'Teslim edildi';
    if (s.includes('transit') || s.includes('yolda') || s.includes('shipment')) return 'Yolda';
    if (s.includes('pick') || s.includes('collection')) return 'Toplandı';
    if (s.includes('exception') || s.includes('failure')) return 'Gecikme / sorun';
    return raw;
}

/**
 * DHL API yanıtından teslim edildi mi?
 * @param {string | null | undefined} raw
 */
function isDeliveredTrackingStatus(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return false;
    return s.includes('deliver') || s === 'dl' || s === 'ok';
}

module.exports = {
    buildPublicTrackingUrl,
    trackingStatusLabelTr,
    isDeliveredTrackingStatus,
};
