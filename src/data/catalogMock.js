/** Tüm ürünler sayfası — örnek veri (ileride API ile değiştirilebilir). */

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
    id: '1',
    brand: 'ASTA TİCARET',
    name: 'Leke Karşıtı Bakım Kremi',
    price: 3449,
    image: img('photo-1570194065650-d99fb4b38b17'),
    categories: ['Yüz Kremi'],
    skinTypes: ['Kuru', 'Olgun Cilt'],
  },
  {
    id: '2',
    brand: 'ASTA TİCARET',
    name: 'Hyaluron Nemlendirici Serum',
    price: 899,
    image: img('photo-1612817288484-6f916006741a'),
    categories: ['Serum', 'Nemlendirici'],
    skinTypes: ['Kuru', 'Hassas'],
  },
  {
    id: '3',
    brand: 'ASTA TİCARET',
    name: 'SPF 50+ Güneş Koruyucu Fluid',
    price: 579,
    image: img('photo-1620916566398-39f1143ab7be'),
    categories: ['Güneş Koruyucu'],
    skinTypes: ['Yağlı/Karma', 'Hassas'],
  },
  {
    id: '4',
    brand: 'ASTA TİCARET',
    name: 'pH5 Hassas Cilt Temizleyici Jel',
    price: 419,
    image: img('photo-1570172619644-dfd03ed8d17b'),
    categories: ['Temizleyici'],
    skinTypes: ['Hassas'],
  },
  {
    id: '5',
    brand: 'ASTA TİCARET',
    name: 'Gece Onarıcı Bakım Kremi',
    price: 1299,
    image: img('photo-1556228578-659cd584233d'),
    categories: ['Yüz Kremi', 'Nemlendirici'],
    skinTypes: ['Kuru', 'Olgun Cilt'],
  },
  {
    id: '6',
    brand: 'ASTA TİCARET',
    name: 'Ceramide Günlük Nem Bariyer Kremi',
    price: 749,
    image: img('photo-1598440947619-2c35fc9aa908'),
    categories: ['Nemlendirici'],
    skinTypes: ['Hassas', 'Kuru'],
  },
  {
    id: '7',
    brand: 'ASTA TİCARET',
    name: 'Anti-Aging Göz Çevresi Kremi',
    price: 989,
    image: img('photo-1515378791036-0648a3bdd77d'),
    categories: ['Göz Çevresi'],
    skinTypes: ['Olgun Cilt'],
  },
  {
    id: '8',
    brand: 'ASTA TİCARET',
    name: 'Vücut Losyonu Ultra Hydration',
    price: 459,
    image: img('photo-1556228720-195a672e8a03'),
    categories: ['Vücut Kremi'],
    skinTypes: ['Kuru'],
  },
  {
    id: '9',
    brand: 'ASTA TİCARET',
    name: 'Yağ Kontrol Temizleyici Köpük',
    price: 389,
    image: img('photo-1567720643512-068fcc73c260'),
    categories: ['Temizleyici'],
    skinTypes: ['Yağlı/Karma'],
  },
  {
    id: '10',
    brand: 'ASTA TİCARET',
    name: 'Tonik Dengeli Cilt Tonu',
    price: 329,
    image: img('photo-1596755094514-f87a0847fcf7'),
    categories: ['Temizleyici'],
    skinTypes: ['Yağlı/Karma', 'Hassas'],
  },
  {
    id: '11',
    brand: 'ASTA TİCARET',
    name: 'Saç Derisi Hassas Şampuan',
    price: 449,
    image: img('photo-1631729361328-ac44342f8499'),
    categories: ['Saç Bakımı'],
    skinTypes: ['Hassas'],
  },
  {
    id: '12',
    brand: 'ASTA TİCARET',
    name: 'Çok Yüksek Koruma Güneş Spreyi',
    price: 699,
    image: img('photo-1598440947619-2c35fc9aa908'),
    categories: ['Güneş Koruyucu'],
    skinTypes: ['Kuru', 'Yağlı/Karma'],
  },
];
