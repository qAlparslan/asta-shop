import { assetUrl } from '../config/api.js';

/** Logo yokken kullanılan varsayılan sekme ikonu */
export const SITE_FAVICON_DEFAULT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a2332'/%3E%3Cpath d='M16 7 24 25h-3.5l-1.7-4H13.2l-1.7 4H8L16 7zm-1.2 11h2.4L16 14.2 14.8 18z' fill='%239f2133'/%3E%3C/svg%3E";

export const SITE_FAVICON_DEFAULT_TYPE = 'image/svg+xml';

function faviconMime(href) {
  const lower = String(href).split('?')[0].toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return '';
}

function upsertLink(rel, href, type) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
  if (type) {
    link.setAttribute('type', type);
  } else {
    link.removeAttribute('type');
  }
}

/** Mağaza logosunu tarayıcı sekmesi ikonu olarak uygular */
export function applyFaviconFromLogo(logoUrlRaw) {
  if (typeof document === 'undefined') return;

  const raw = String(logoUrlRaw ?? '').trim();
  const href = raw ? assetUrl(raw) : SITE_FAVICON_DEFAULT;
  const type = raw ? faviconMime(href) || faviconMime(raw) : SITE_FAVICON_DEFAULT_TYPE;

  document.querySelectorAll('link[rel="shortcut icon"]').forEach((el) => el.remove());
  upsertLink('icon', href, type || undefined);
  if (raw) {
    upsertLink('apple-touch-icon', href, type || undefined);
  }
}
