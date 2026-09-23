/**
 * Kaydırmalı hero slaytları — görseller yatay kırpım (16:9) ile yüklenir.
 * API yokken HeroSection bu listeyi kullanır.
 */

const crop = 'auto=format&fit=crop&w=1024&h=576&q=75';

export const heroSlides = [
  {
    id: 'yeni-sezon-bakim',
    title: 'Yeni sezon cilt bakım koleksiyonu',
    description:
      'Dermatolojik testlerden geçmiş formüllerle cildinize ihtiyacı olan nemi ve korumayı sağlayın. Çok satan ürünleri keşfedin.',
    ctaLabel: 'Alışverişe başla',
    ctaHref: '#cok-satanlar',
    imageSrc: `https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?${crop}`,
    imageAlt: 'Cilt bakım ürünleri koleksiyonu',
  },
  {
    id: 'gunluk-rutin',
    title: 'Günlük rutininize uygun bakım',
    description:
      'Temizlik, nem ve koruma adımlarıyla cilt bariyerinizi destekleyin. Karma ve hassas ciltler için yumuşak ama etkili seçenekler.',
    ctaLabel: 'Ürünleri keşfet',
    ctaHref: '/urunler',
    imageSrc: `https://images.unsplash.com/photo-1570172619644-dfd03ed8d17b?${crop}`,
    imageAlt: 'Günlük cilt bakım rutini',
  },
  {
    id: 'guven-kargo',
    title: 'Orijinal ürün, hızlı teslimat',
    description:
      '%100 orijinal ürün garantisi, güvenli ödeme ve hızlı kargo seçenekleriyle siparişinizi güvenle tamamlayın.',
    ctaLabel: 'Çok satanları gör',
    ctaHref: '#cok-satanlar',
    imageSrc: `https://images.unsplash.com/photo-1612817288484-6f916006741a?${crop}`,
    imageAlt: 'Kozmetik ve bakım ürünleri',
  },
];
