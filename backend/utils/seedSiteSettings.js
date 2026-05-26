const SiteSetting = require('../models/SiteSetting');

const DEFAULTS = [
    // Mağaza Bilgileri
    { key: 'storeName', value: 'Asta Ticaret', type: 'string' },
    { key: 'storeTagline', value: 'Doğal, saf ve etik güzellik ürünleri', type: 'string' },
    { key: 'logoUrl', value: '', type: 'string' },

    // Kargo & Vergi
    { key: 'shippingFeeEnabled', value: 'true', type: 'boolean' },
    { key: 'standardShippingFee', value: '50', type: 'number' },
    { key: 'freeShippingEnabled', value: 'true', type: 'boolean' },
    { key: 'freeShippingThreshold', value: '500', type: 'number' },
    { key: 'vatDisplayEnabled', value: 'true', type: 'boolean' },
    { key: 'vatRate', value: '20', type: 'number' },

    // İletişim / Footer
    { key: 'footerEmail', value: 'info@astaticaret.com', type: 'string' },
    { key: 'footerPhone', value: '+90 555 123 45 67', type: 'string' },
    { key: 'footerAddress', value: 'İstanbul, Türkiye', type: 'string' },
    { key: 'footerFacebookUrl', value: '', type: 'string' },
    { key: 'footerInstagramUrl', value: '', type: 'string' },
    { key: 'footerTwitterUrl', value: '', type: 'string' },
    { key: 'footerWhatsAppUrl', value: '', type: 'string' },

    /** İletişim sayfası — şirket / vergi bildirimi (destek için footer e-posta ve telefon kullanılabilir). */
    { key: 'companyLegalName', value: '', type: 'string' },
    { key: 'companyTaxOffice', value: '', type: 'string' },
    { key: 'companyTaxNumber', value: '', type: 'string' },
    { key: 'companyRegisteredAddress', value: '', type: 'string' },

    /** Alt bilgi — ödeme / SSL / kargo görselleri (URL boş ise kartlar için yerleşik görsel kullanılır). */
    { key: 'footerTrustShowPaymentCards', value: 'true', type: 'boolean' },
    { key: 'footerTrustVisaUrl', value: '', type: 'string' },
    { key: 'footerTrustMastercardUrl', value: '', type: 'string' },
    { key: 'footerTrustTroyUrl', value: '', type: 'string' },
    { key: 'footerTrustSslUrl', value: '', type: 'string' },
    { key: 'footerTrustCarrierUrl', value: '', type: 'string' },
    { key: 'footerTrustCarrierLabel', value: '', type: 'string' },

    // Bakım Modu
    { key: 'maintenanceMode', value: 'false', type: 'boolean' },
    { key: 'maintenanceMessage', value: 'Sitemiz kısa süreliğine bakımda. Çok yakında geri döneceğiz.', type: 'string' },

    /** Mağaza cilt filtresi seçenekleri (JSON dizisi — slug / label / enabled / sıra) */
    {
        key: 'skinFilterOptions',
        value:
            '[{"slug":"hassas","label":"Hassas","enabled":true},{"slug":"kuru","label":"Kuru","enabled":true},{"slug":"yagli_karma","label":"Yağlı/Karma","enabled":true},{"slug":"olgun","label":"Olgun cilt","enabled":true}]',
        type: 'string',
    },

    /** Site ön yüz metinleri (kısmi JSON; kod varsayılanlarıyla birleştirilir) */
    { key: 'frontendCopy', value: '{}', type: 'string' },

    /** Yasal sayfalar (KVKK, gizlilik vb.) opsiyonel override — kod varsayılanı ile birleşir; yönetimi /api/legal/admin */
    { key: 'legalDocumentsJson', value: '', type: 'string' },

    /** Ana sayfa hero altı güven kartları — şablon + başlık, en fazla 4 */
    {
        key: 'heroTrustCards',
        value: JSON.stringify([
            { id: 'trust-1', presetKey: 'shield-soft', title: '%100 Orijinal Ürün' },
            { id: 'trust-2', presetKey: 'truck-soft', title: '750 ₺ üzeri ücretsiz kargo' },
            { id: 'trust-3', presetKey: 'lock-soft', title: '256-bit SSL güvenli ödeme' },
            { id: 'trust-4', presetKey: 'headphones-soft', title: '7/24 Müşteri desteği' },
        ]),
        type: 'string',
    },

    // Stok uyarıları
    { key: 'lowStockThreshold', value: '5', type: 'number' },
];

async function seedSiteSettings() {
    for (const s of DEFAULTS) {
        await SiteSetting.findOrCreate({ where: { key: s.key }, defaults: s });
    }
}

module.exports = seedSiteSettings;
