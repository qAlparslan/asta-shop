/**
 * @param {string | null | undefined} carrier
 * @param {string | null | undefined} trackingNumber
 * @returns {string | null}
 */
export function buildPublicTrackingUrl(carrier, trackingNumber) {
  const no = String(trackingNumber || '').trim();
  if (!no) return null;
  const c = String(carrier || 'DHL').trim().toUpperCase();
  if (c === 'DHL' || c === 'DHL_EXPRESS') {
    return `https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=${encodeURIComponent(no)}`;
  }
  return null;
}

/** @param {string | null | undefined} raw */
export function trackingStatusLabelTr(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (s.includes('deliver')) return 'Teslim edildi';
  if (s.includes('transit') || s.includes('shipment')) return 'Yolda';
  if (s.includes('pick') || s.includes('collection')) return 'Toplandı';
  if (s.includes('exception') || s.includes('failure')) return 'Gecikme / sorun';
  return String(raw);
}
