const DEFAULT_WIDTHS = [480, 768, 1024, 1280];

/**
 * Unsplash / harici görseller için responsive srcSet; yüklenen dosyalar olduğu gibi döner.
 * @param {string} url
 * @param {{ widths?: number[]; quality?: number }} [opts]
 */
export function buildResponsiveImage(url, opts = {}) {
  const raw = String(url || '').trim();
  if (!raw) return { src: '', srcSet: '', sizes: '' };

  const widths = opts.widths || DEFAULT_WIDTHS;
  const quality = opts.quality ?? 75;

  if (/images\.unsplash\.com/i.test(raw)) {
    const base = raw.split('?')[0];
    const mk = (w) =>
      `${base}?auto=format&fit=crop&w=${w}&q=${quality}`;
    const mid = widths[Math.min(2, widths.length - 1)] || 768;
    return {
      src: mk(mid),
      srcSet: widths.map((w) => `${mk(w)} ${w}w`).join(', '),
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px',
    };
  }

  return { src: raw, srcSet: '', sizes: '' };
}

/** @param {string} url */
export function preloadImage(url) {
  const src = String(url || '').trim();
  if (!src || typeof document === 'undefined') return;
  const id = 'asta-lcp-preload';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'preload';
  link.as = 'image';
  link.href = buildResponsiveImage(src).src;
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}
