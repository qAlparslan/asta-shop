/** Mağaza yasal sayfaları — admin paneli ve footer ile aynı sıra. */
export const LEGAL_DOCUMENT_LINKS = Object.freeze([
  { slug: 'gizlilik', label: 'Gizlilik politikası' },
  { slug: 'kvkk', label: 'KVKK aydınlatma' },
  { slug: 'cerez', label: 'Çerez politikası' },
  { slug: 'kullanim', label: 'Kullanım koşulları' },
  { slug: 'on-bilgilendirme', label: 'Ön bilgilendirme' },
  { slug: 'mesafeli-satis', label: 'Mesafeli satış sözleşmesi' },
  { slug: 'iade', label: 'İade politikası' },
]);

export function legalDocHref(slug) {
  return `/yasal/${slug}`;
}
