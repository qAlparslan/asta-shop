const HomeHeroSlide = require('../models/HomeHeroSlide');

const DEFAULTS = [
    {
        sortOrder: 0,
        title: 'Cildiniz için dermatoloji odaklı bakım',
        subtitle:
            'Hassas tenlerden yaşlanma karşıtı bakıma; temiz içerikli, güvenilir markalar tek adreste. İhtiyacınıza uygun ürünleri keşfedin.',
        ctaText: 'Alışverişe başla',
        ctaUrl: '/urunler',
        bgType: 'gradient',
        bgGradient:
            'linear-gradient(135deg, rgb(245 247 251) 0%, rgb(230 237 246) 45%, rgb(221 229 239) 100%)',
        isActive: true,
    },
    {
        sortOrder: 1,
        title: 'Günlük rutininize uygun ürünler',
        subtitle:
            'Temizlik, nemlendirme ve koruma üçlüsü ile cilt bariyerini destekleyen formüller. Karma ve hassas ciltler için yumuşak seçenekler.',
        ctaText: 'Ürünleri incele',
        ctaUrl: '/urunler',
        bgType: 'gradient',
        bgGradient:
            'linear-gradient(135deg, rgb(251 246 246) 0%, rgb(238 229 229) 50%, rgb(227 217 217) 100%)',
        isActive: true,
    },
    {
        sortOrder: 2,
        title: 'Orijinal ürün, şeffaf hizmet',
        subtitle:
            'Otomatik bildirimler ve müşteri hizmetleri ile siparişinizi güvenle tamamlayın. Çok satanları ve fırsatları kaçırmayın.',
        ctaText: 'Çok satanlar',
        ctaUrl: '/#cok-satanlar',
        bgType: 'gradient',
        bgGradient:
            'linear-gradient(135deg, rgb(241 246 239) 0%, rgb(224 231 217) 50%, rgb(208 217 203) 100%)',
        isActive: true,
    },
];

async function seedHomeHeroSlides() {
    const count = await HomeHeroSlide.count();
    if (count > 0) return;
    await HomeHeroSlide.bulkCreate(DEFAULTS);
    console.log('📎 Varsayılan anasayfa hero slaytları oluşturuldu.');
}

module.exports = seedHomeHeroSlides;
