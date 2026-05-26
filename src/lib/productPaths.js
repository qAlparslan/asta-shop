/** Mağaza ürün detay URL'i (slug varsa slug, yoksa güvenli id yolu). */
export function storefrontProductPath(p) {
  const id = typeof p?.id === 'string' ? p.id : p?.id != null ? String(p.id) : '';
  const slug = typeof p?.slug === 'string' ? p.slug.trim() : '';
  if (slug) return `/urun/${encodeURIComponent(slug)}`;
  if (id) return `/urun/p/${encodeURIComponent(id)}`;
  return '/urunler';
}
