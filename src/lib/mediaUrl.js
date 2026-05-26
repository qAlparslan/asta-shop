import { API_ORIGIN } from '../config/api.js';

/**
 * API'den gelen `/uploads/...` göreli yolları tam URL yapar (VITE_API_ORIGIN veya DEV'de localhost:5000).
 * Önizleme / yapı üretilmiş build için API ile aynı kök kullanılmalıdır; göreli path yalnızca
 * tek origin + `/uploads` reverse proxy ise yeterli.
 */
export function mediaUrl(pathValue) {
  if (!pathValue || typeof pathValue !== 'string') return '';
  if (/^https?:\/\//i.test(pathValue)) return pathValue;
  const p = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  return API_ORIGIN ? `${API_ORIGIN}${p}` : p;
}
