/**
 * Kargo firmasına göre kamuya açık takip URL'i.
 * MNG Kargo = DHL eCommerce TR — aynı altyapı, takip linki MNG'nin sayfasından çalışıyor.
 * @param {string | null | undefined} carrier
 * @param {string | null | undefined} trackingNumber
 * @returns {string | null}
 */
function buildPublicTrackingUrl(carrier, trackingNumber) {
    const no = String(trackingNumber || '').trim();
    if (!no) return null;

    const c = String(carrier || 'MNG').trim().toUpperCase();
    if (
        c === 'MNG' ||
        c === 'MNG_KARGO' ||
        c === 'DHL' ||
        c === 'DHL_ECOMMERCE' ||
        c === 'DHL_ECOMMERCE_TR'
    ) {
        return `https://kargotakip.mngkargo.com.tr/?takipNo=${encodeURIComponent(no)}`;
    }
    if (c === 'DHL_EXPRESS') {
        return `https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=${encodeURIComponent(no)}`;
    }
    return null;
}

/**
 * Kargo ham durumunu müşteri arayüzü için kısa Türkçe etiket.
 * MNG dönüşleri zaten Türkçe ("Teslim Edildi", "Transfer Aşamasında" vs.) — onları
 * standart bir form'a normalize ediyoruz.
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
function trackingStatusLabelTr(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return null;
    if (s.includes('teslim edildi') || s.includes('deliver')) return 'Teslim edildi';
    if (s.includes('teslim edilemedi') || s.includes('failure') || s.includes('exception'))
        return 'Teslim edilemedi';
    if (s.includes('alıcı adres') || s.includes('out for delivery')) return 'Dağıtımda';
    if (s.includes('transfer') || s.includes('transit') || s.includes('yolda')) return 'Yolda';
    if (s.includes('teslimat birim')) return 'Şubeye ulaştı';
    if (s.includes('hazırlandı') || s.includes('pick') || s.includes('collection')) return 'Hazırlandı';
    if (s.includes('geri geliyor') || s.includes('returned')) return 'İade ediliyor';
    return raw;
}

/**
 * Kargo API yanıtından teslim edildi mi?
 * @param {string | null | undefined} raw
 */
function isDeliveredTrackingStatus(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return false;
    if (s.includes('teslim edildi')) return true;
    if (s.includes('deliver')) return true;
    if (s === 'dl' || s === 'ok') return true;
    return false;
}

module.exports = {
    buildPublicTrackingUrl,
    trackingStatusLabelTr,
    isDeliveredTrackingStatus,
};
