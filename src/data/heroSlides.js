/**
 * Kaydırmalı hero slaytları — görseller yatay kırpım (16:9) ile yüklenir.
 */

const crop = 'auto=format&fit=crop&w=1024&h=576&q=75';

export const heroSlides = [
  {
    id: 'eucerin-dogru-bakim',
    title: 'Eucerin ile cildiniz için doğru bakım',
    description:
      'Dermatolojik araştırmalarla geliştirilen formüller; hassas ciltlerden yaşlanma karşıtı bakıma kadar geniş ürün yelpazesi. İhtiyacınıza uygun çözümü keşfedin.',
    ctaLabel: 'Alışverişe başla',
    ctaHref: '#cok-satanlar',
    imageSrc: `https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?${crop}`,
    imageAlt: 'Eucerin bakım ürünleri',
  },
  {
    id: 'gunluk-rutin',
    title: 'Günlük rutininize uygun dermatolojik bakım',
    description:
      'Temizlik, nem ve koruma adımlarıyla cilt bariyerinizi destekleyin. Karma ve hassas ciltler için yumuşak ama etkili seçenekler tek adresde.',
    ctaLabel: 'Ürünleri keşfet',
    ctaHref: '/urunler',
    imageSrc: `https://images.unsplash.com/photo-1570172619644-dfd03ed8d17b?${crop}`,
    imageAlt: 'Cilt bakım ürünleri — yatay kompozisyon',
  },
  {
    id: 'guven-kargo',
    title: 'Orijinal ürün, hızlı teslimat',
    description:
      '%100 orijinal ürün garantisi, güvenli ödeme ve aynı gün kargo seçenekleriyle siparişinizi güvenle tamamlayın. Sorularınız için destek ekibimiz yanınızda.',
    ctaLabel: 'Çok satanları gör',
    ctaHref: '#cok-satanlar',
    imageSrc: `https://images.unsplash.com/photo-1612817288484-6f916006741a?${crop}`,
    imageAlt: 'Kozmetik ve bakım ürünleri düzeni',
  },
  {
    id: 'gunes-koruma',
    title: 'Her mevsim güneşe karşı korunun',
    description:
      'SPF içeren güneş koruyucularla UV kaynaklı erken yaşlanmayı ve leke oluşumunu azaltın. Tüm cilt tonları için hafif ve yağsız dokular.',
    ctaLabel: 'Güneş ürünleri',
    ctaHref: '/urunler',
    imageSrc: `https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?${crop}`,
    imageAlt: 'Güneş koruma ve bakım ürünleri',
  },
];
