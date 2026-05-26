/**
 * API kök adresi: `VITE_API_ORIGIN` (build zamanında gömülür).
 * Geliştirmede `.env` içinde tanımlı değilse varsayılan localhost kullanılır.
 */
function resolveApiOrigin() {
  const fromEnv = import.meta.env.VITE_API_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:5000'.replace(/\/$/, '');
  if (import.meta.env.PROD) {
    console.error(
      '[api] VITE_API_ORIGIN bos — production build oncesi .env veya .env.production icine ekleyin',
    );
  }
  return '';
}

export const API_ORIGIN = resolveApiOrigin();

export const API_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/** /uploads/... ve göreli yollar için tam görsel URL'i */
export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}
