/**
 * Yasal metin sürümleri — tek kaynak.
 * Güncellendiğinde: çerez bandı + checkout + kayıt formları aynı sürümü kullanmalı.
 */
module.exports = {
    PRIVACY_VERSION: '2026-05-14',
    KVKK_VERSION: '2026-05-14',
    COOKIE_POLICY_VERSION: '2026-05-14',
    TERMS_OF_USE_VERSION: '2026-05-14',
    /** Ön bilgilendirme (6502 / mesafeli satış öncesi) */
    PRE_INFO_SALES_VERSION: '2026-05-14',
    /** Mesafeli satış sözleşmesi */
    DISTANCE_SALES_VERSION: '2026-05-14',
    /** İade politikasının sürüm kodu (mağaza metni API ile birleşir) */
    RETURNS_POLICY_VERSION: '2026-05-14',

    summaries: {
        privacy:
            '6698 sayılı KVKK ve ilgili mevzuat kapsamında kişisel verilerinizin işlenmesine ilişkin bilgilendirme.',
        kvkk: 'Veri sorumlusu sıfatıyla kişisel verilerin işlenme amaçları, hukuki sebepleri ve haklarınız.',
        cookies:
            'Zorunlu çerezler sitenin çalışması için gereklidir; analitik çerezler tercihe bağlıdır.',
        termsOfUse: 'Siteyi kullanımınıza bağlayan kurallar ve yükümlülükler.',
        preInfoSales:
            'Mesafeli satış sözleşmesinin kurulmasından önce tüketicinin bilgilendirilmesi (ön bilgilendirme).',
        distanceSales:
            'Satıcı ve alıcı arasındaki mesafeli satış sözleşmesinin şartları, cayma ve uyuşmazlık süreçleri.',
        returnsPolicy: 'Cayma, iade ve ücret iadesi süreçlerine ilişkin özet.',
    },
};
