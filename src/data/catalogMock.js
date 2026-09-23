/** Tüm ürünler sayfası — örnek veri (API yokken veya boşken kullanılır). */

export const SORT_OPTIONS = [
  { id: 'recommended', label: 'Önerilen sıralama' },
  { id: 'nameAsc', label: 'Alfabetik A — Z' },
  { id: 'nameDesc', label: 'Alfabetik Z — A' },
  { id: 'priceAsc', label: 'En düşük fiyat' },
  { id: 'priceDesc', label: 'En yüksek fiyat' },
];

export const CATEGORY_OPTIONS = [
  'Yüz Kremi',
  'Vücut Kremi',
  'Güneş Koruyucu',
  'Serum',
  'Temizleyici',
  'Nemlendirici',
  'Göz Çevresi',
  'Saç Bakımı',
];

export const SKIN_TYPE_OPTIONS = ['Hassas', 'Kuru', 'Yağlı/Karma', 'Olgun Cilt'];

const img = (seed) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&h=600&q=80`;

export const CATALOG_PRODUCTS = [
  {
    id: 'demo-1',
    slug: 'hyaluron-nemlendirici-serum',
    brand: 'ASTA TİCARET',
    name: 'Hyaluron Nemlendirici Serum',
    price: 899,
    compareAtPrice: 1099,
    discountPercent: 18,
    isOnSale: true,
    image: img('photo-1612817288484-6f916006741a'),
    gallery: [img('photo-1612817288484-6f916006741a')],
    categories: ['Serum', 'Nemlendirici'],
    skinTypes: ['Kuru', 'Hassas'],
    tag: 'cok-satan',
    reviewCount: 24,
    averageRating: 4.7,
    description:
      '<p>Yoğun hyaluronik asit içeren hafif serum, cildin nem bariyerini destekler. Sabah ve akşam temiz cilde birkaç damla uygulayın.</p>',
    variants: [],
  },
  {
    id: 'demo-2',
    slug: 'spf-50-gunes-koruyucu-fluid',
    brand: 'ASTA TİCARET',
    name: 'SPF 50+ Güneş Koruyucu Fluid',
    price: 579,
    compareAtPrice: null,
    discountPercent: null,
    isOnSale: false,
    image: img('photo-1620916566398-39f1143ab7be'),
    gallery: [img('photo-1620916566398-39f1143ab7be')],
    categories: ['Güneş Koruyucu'],
    skinTypes: ['Yağlı/Karma', 'Hassas'],
    tag: 'cok-satan',
    reviewCount: 18,
    averageRating: 4.5,
    description:
      '<p>Geniş spektrumlu, yağsız formül. Günlük kullanım için hafif doku; makyaj altında da rahatlıkla kullanılabilir.</p>',
    variants: [],
  },
  {
    id: 'demo-3',
    slug: 'leke-karsiti-bakim-kremi',
    brand: 'ASTA TİCARET',
    name: 'Leke Karşıtı Bakım Kremi',
    price: 3449,
    compareAtPrice: 3899,
    discountPercent: 12,
    isOnSale: true,
    image: img('photo-1570194065650-d99fb4b38b17'),
    gallery: [img('photo-1570194065650-d99fb4b38b17')],
    categories: ['Yüz Kremi'],
    skinTypes: ['Kuru', 'Olgun Cilt'],
    tag: 'cok-satan',
    reviewCount: 31,
    averageRating: 4.8,
    description:
      '<p>Düzenli kullanımda cilt tonunu eşitlemeye yardımcı formül. Akşam bakım rutininin son adımında uygulayın.</p>',
    variants: [],
  },
  {
    id: 'demo-4',
    slug: 'ph5-hassas-cilt-temizleyici-jel',
    brand: 'ASTA TİCARET',
    name: 'pH5 Hassas Cilt Temizleyici Jel',
    price: 419,
    compareAtPrice: null,
    discountPercent: null,
    isOnSale: false,
    image: img('photo-1570172619644-dfd03ed8d17b'),
    gallery: [img('photo-1570172619644-dfd03ed8d17b')],
    categories: ['Temizleyici'],
    skinTypes: ['Hassas'],
    tag: '',
    reviewCount: 12,
    averageRating: 4.4,
    description:
      '<p>pH dengeli jel temizleyici; hassas ciltlerde kuruluk hissi bırakmadan nazikçe temizler.</p>',
    variants: [],
  },
  {
    id: 'demo-5',
    slug: 'gece-onarici-bakim-kremi',
    brand: 'ASTA TİCARET',
    name: 'Gece Onarıcı Bakım Kremi',
    price: 1299,
    compareAtPrice: 1499,
    discountPercent: 13,
    isOnSale: true,
    image: img('photo-1556228578-659cd584233d'),
    gallery: [img('photo-1556228578-659cd584233d')],
    categories: ['Yüz Kremi', 'Nemlendirici'],
    skinTypes: ['Kuru', 'Olgun Cilt'],
    tag: '',
    reviewCount: 9,
    averageRating: 4.6,
    description:
      '<p>Gece boyunca cildi besleyen zengin krem. Temiz cilde masaj yaparak uygulayın; sabah daha canlı bir görünüm.</p>',
    variants: [],
  },
];

/** Geliştirme ortamında API olmadan vitrin göstermek için */
export function useDemoCatalogFallback() {
  if (import.meta.env.VITE_USE_DEMO_CATALOG === 'true') return true;
  if (import.meta.env.DEV && !String(import.meta.env.VITE_API_ORIGIN || '').trim()) return true;
  return false;
}

/** @param {{ slug?: string; productId?: string }} params */
export function findDemoCatalogProduct({ slug, productId }) {
  const s = String(slug || '').trim();
  const id = String(productId || '').trim();
  return (
    CATALOG_PRODUCTS.find((p) => (s && p.slug === s) || (id && p.id === id)) || null
  );
}

/** Ürün detay sayfası için API satırı biçimine çevirir */
export function demoProductToApiRow(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.categories[0] || '',
    description: product.description || '',
    images: JSON.stringify([product.image]),
    price: product.price,
    compare_at_price: product.compareAtPrice ?? null,
    tag: product.tag || '',
    skin_type: 'tumu',
    stock: 100,
    variants: '[]',
    reviewCount: product.reviewCount || 0,
    averageRating: product.averageRating || 0,
  };
}
