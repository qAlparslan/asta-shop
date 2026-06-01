/**
 * Kargo takip numarasından kamuya açık takip URL'i.
 * Varsayılan olarak MNG Kargo / DHL eCommerce TR'nin ortak takip sayfasına yönlendirir.
 * @param {string | null | undefined} _carrier  (kullanılmıyor; geriye dönük uyumluluk için)
 * @param {string | null | undefined} trackingNumber
 * @returns {string | null}
 */
export function buildPublicTrackingUrl(_carrier, trackingNumber) {
  const no = String(trackingNumber || '').trim();
  if (!no) return null;
  return `https://kargotakip.mngkargo.com.tr/?takipNo=${encodeURIComponent(no)}`;
}
