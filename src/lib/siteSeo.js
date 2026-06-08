/** @param {string} name */
function upsertMetaByName(name, content) {
  if (typeof document === 'undefined') return;
  const value = String(content ?? '').trim();
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/** @param {string} property */
function upsertMetaByProperty(property, content) {
  if (typeof document === 'undefined') return;
  const value = String(content ?? '').trim();
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/** @param {string} rel */
function upsertLink(rel, href) {
  if (typeof document === 'undefined') return;
  const value = String(href ?? '').trim();
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', value);
}

const JSON_LD_ID = 'asta-page-jsonld';

/** @param {Record<string, unknown> | Record<string, unknown>[] | null | undefined} data */
function upsertJsonLd(data) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(JSON_LD_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing || document.createElement('script');
  el.id = JSON_LD_ID;
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(el);
}

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   canonical?: string;
 *   ogType?: string;
 *   jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
 * }} opts
 */
export function applyPageSeo(opts = {}) {
  if (opts.title) document.title = opts.title;
  if (opts.description != null) upsertMetaByName('description', opts.description);
  if (opts.canonical != null) upsertLink('canonical', opts.canonical);
  if (opts.description != null) {
    upsertMetaByProperty('og:description', opts.description);
    upsertMetaByName('twitter:description', opts.description);
  }
  if (opts.title) {
    upsertMetaByProperty('og:title', opts.title);
    upsertMetaByName('twitter:title', opts.title);
  }
  if (opts.canonical) upsertMetaByProperty('og:url', opts.canonical);
  if (opts.ogType) upsertMetaByProperty('og:type', opts.ogType);
  if (Object.prototype.hasOwnProperty.call(opts, 'jsonLd')) upsertJsonLd(opts.jsonLd);
}

/** @param {Record<string, unknown>} settings */
export function buildDefaultSiteDescription(settings) {
  const tagline = String(settings?.storeTagline ?? '').trim();
  const storeName = String(settings?.storeName ?? '').trim() || 'Asta Ticaret';
  if (tagline) {
    return `${storeName} — ${tagline}. Güvenilir online alışveriş, orijinal ürünler ve hızlı teslimat.`;
  }
  return `${storeName} — doğal ve güvenilir güzellik ürünleri. Online mağazamızdan güvenle alışveriş yapın.`;
}

/** @param {string} path */
export function buildCanonicalUrl(path = '/') {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}

/** Düz metin özet (HTML strip). */
export function excerptPlain(text, max = 155) {
  const plain = String(text ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trim()}…`;
}
