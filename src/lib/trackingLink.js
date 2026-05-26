/**
 * MNG Kargo = DHL eCommerce TR ortak takip URL'i.
 * @param {string | null | undefined} carrier
 * @param {string | null | undefined} trackingNumber
 * @returns {string | null}
 */
export function buildPublicTrackingUrl(carrier, trackingNumber) {
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

/** @param {string | null | undefined} raw */
export function trackingStatusLabelTr(raw) {
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
  return String(raw);
}
