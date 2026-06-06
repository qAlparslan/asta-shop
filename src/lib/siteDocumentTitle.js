/** Sekme başlığı: "ASTA TİCARET - Slogan" */
export function buildSiteDocumentTitle(settings) {
  const storeName = String(settings?.storeName ?? '').trim() || 'ASTA TİCARET';
  const tagline = String(settings?.storeTagline ?? '').trim();
  if (tagline) return `${storeName} - ${tagline}`;
  return storeName;
}

export function applySiteDocumentTitle(settings) {
  if (typeof document === 'undefined') return;
  document.title = buildSiteDocumentTitle(settings);
}
