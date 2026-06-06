/** Navbar logosundan bağımsız sabit sekme ikonu (data URI — nginx SPA fallback'ten etkilenmez) */
export const SITE_FAVICON_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a2332'/%3E%3Cpath d='M16 7 24 25h-3.5l-1.7-4H13.2l-1.7 4H8L16 7zm-1.2 11h2.4L16 14.2 14.8 18z' fill='%239f2133'/%3E%3C/svg%3E";

export const SITE_FAVICON_TYPE = 'image/svg+xml';

export function applySiteFavicon() {
  if (typeof document === 'undefined') return;

  const selectors = 'link[rel="icon"], link[rel="shortcut icon"]';
  document.querySelectorAll(selectors).forEach((link) => {
    if (link.getAttribute('href') !== SITE_FAVICON_DATA_URI) {
      link.setAttribute('href', SITE_FAVICON_DATA_URI);
      link.setAttribute('type', SITE_FAVICON_TYPE);
    }
  });

  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = SITE_FAVICON_TYPE;
    link.href = SITE_FAVICON_DATA_URI;
    document.head.appendChild(link);
  }
}
