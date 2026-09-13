import { API_ORIGIN } from '../config/api.js';

/**
 * API'den gelen `/uploads/...` yollarını tarayıcının gerçekten yükleyebileceği URL yapar.
 *
 * Canlıda Nginx (aaPanel) `*.jpg|*.png` kuralı `/uploads/foto.jpg` isteğini dist içinde
 * arar → 404 HTML, konsolda JS hatası yok. `/api/media?path=` aynı `/api/` proxy'sinden geçer.
 */
export function mediaUrl(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') return '';
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  const p = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  const origin = API_ORIGIN || '';
  if (p.startsWith('/uploads/')) {
    const rel = p.slice('/uploads/'.length);
    if (!rel) return '';
    return `${origin}/api/media?path=${encodeURIComponent(rel)}`;
  }
  return origin ? `${origin}${p}` : p;
}
