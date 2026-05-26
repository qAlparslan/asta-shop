const legal = require('./legalVersions');

const COMPANY = 'ASTA TİCARET';
const WEBSITE = 'asta ticaret çevrimiçi mağazası';
const CONTACT_EMAIL = 'info@astaticaret.com';

function sectionsPrivacy() {
    return [
        {
            heading: '1. Veri sorumlusu',
            paragraphs: [
                `${COMPANY} olarak, kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) ve ilgili mevzuata uygun işlenmektedir. İletişim: ${CONTACT_EMAIL}.`,
            ],
        },
        {
            heading: '2. İşlenen veriler',
            paragraphs: [
                'Kimlik ve iletişim (ad-soyad, e-posta, telefon, teslimat adresi), işlem güvenliği (sipariş ve ödeme kayıtları), pazarlama (açık rıza ile e-posta bildirimleri), çerez verileri ve kullanım günlükleri (teknik veriler).',
            ],
        },
        {
            heading: '3. Amaç ve hukuki sebepler',
            paragraphs: [
                'Siparişin kurulması ve ifası, yükümlülüklerin yerine getirilmesi, müşteri hizmetleri, yasal yükümlülükler (fatura, muhasebe), güvenlik ve dolandırıcılığın önlenmesi, açık rızanızın bulunduğu hallerde pazarlama iletişimi.',
            ],
        },
        {
            heading: '4. Aktarım',
            paragraphs: [
                'Ödeme hizmeti sağlayıcısı (PayTR), kargo firması, e-fatura / muhasebe yazılımı (ör. Paraşüt) ve yasal zorunluluk halinde yetkili kamu kurumları ile, hizmetin gerektirdiği ölçüde paylaşım yapılabilir.',
            ],
        },
        {
            heading: '5. Saklama süresi',
            paragraphs: [
                'Sipariş ve muhasebe kayıtları ilgili mevzuatta öngörülen süreler boyunca; pazarlama rızası iptal edilene kadar veya süre dolana kadar; çerez bilgileri ilgili çerez politikasına uygun şekilde tutulur.',
            ],
        },
        {
            heading: '6. Haklarınız',
            paragraphs: [
                'KVKK md. 11 kapsamında; verilerinize erişim, düzeltme, silme, işlemenin kısıtlanması, itiraz ve zararın giderilmesi taleplerinde bizimle iletişime geçebilirsiniz. Şikâyet için Kişisel Verileri Koruma Kurulu’na başvurma hakkınız saklıdır.',
            ],
        },
    ];
}

function sectionsKvkk() {
    return [
        {
            heading: '1. Veri sorumlusu kimliği',
            paragraphs: [
                'Ticaret unvanı ve iletişim bilgileri web sitesi ve sipariş süreçlerinde paylaşılmaktadır. Güncel adres ve MERSİS bilgileri için iletişim kanallarımızı kullanın.',
            ],
        },
        {
            heading: '2. Kişisel veri işleme faaliyetleri',
            paragraphs: [
                'Üyelik, sipariş, ödeme, teslimat, iade, müşteri desteği, kampanya ve çerez yönetimi kapsamında veriler işlenir. Detaylar için Aydınlatma Metni / Gizlilik Politikası.',
            ],
        },
        {
            heading: '3. İşleme şartları',
            paragraphs: [
                'Kanunda öngörülen haller (sözleşmenin kurulması veya ifası, hukuki yükümlülük, meşru menfaat, açık rıza) ayrı ayrı değerlendirilir.',
            ],
        },
        {
            heading: '4. Başvuru yöntemi',
            paragraphs: [
                `Taleplerinizi ${CONTACT_EMAIL} üzerinden iletebilirsiniz. Kimlik teyidi için ek belge istenebilir.`,
            ],
        },
    ];
}

function sectionsCookies() {
    return [
        {
            heading: '1. Çerez nedir?',
            paragraphs: [
                'Çerezler, ziyaret ettiğiniz site tarafından cihazınıza kaydedilen küçük metin dosyalarıdır.',
            ],
        },
        {
            heading: '2. Zorunlu çerezler',
            paragraphs: [
                'Oturum, güvenlik, sepet ve ödeme akışının çalışması için gereklidir; devre dışı bırakılamaz.',
            ],
        },
        {
            heading: '3. Tercihe bağlı çerezler',
            paragraphs: [
                'Örneğin analitik çerezler, site kullanımını anlamamıza yardımcı olur. Tercihinizi çerez bildirimi üzerinden yönetebilirsiniz.',
            ],
        },
        {
            heading: '4. Süre ve üçüncü taraflar',
            paragraphs: [
                'Çerez süreleri türüne göre oturum veya kalıcı olabilir. Ödeme ve analitik sağlayıcıları kendi politikalarına tabidir.',
            ],
        },
    ];
}

function sectionsTerms() {
    return [
        {
            heading: '1. Taraflar ve kabul',
            paragraphs: [
                `${WEBSITE} kullanımı bu şartları okuduğunuzu ve kabul ettiğiniz anlamına gelir.`,
            ],
        },
        {
            heading: '2. Hizmet ve içerik',
            paragraphs: [
                'Ürün bilgileri özenle sunulur; stok, renk ve paket görseli farklılıkları teknik olarak mümkündür. Fiyat ve kampanyalar önceden haber verilmeksizin güncellenebilir.',
            ],
        },
        {
            heading: '3. Sipariş ve ödeme',
            paragraphs: [
                'Sipariş, ödeme sağlayıcısı üzerinden onaylandığında kurulur. Sahte veya hatalı bilgi verilmesi halinde sipariş iptal edilebilir.',
            ],
        },
        {
            heading: '4. Sorumluluk sınırlaması',
            paragraphs: [
                'Mücbir sebepler, üçüncü taraf altyapı kesintileri veya müşteri kaynaklı yanlış kullanımdan doğan dolaylı zararlardan, kanunun izin verdiği ölçüde sorumluluk kabul edilmez.',
            ],
        },
        {
            heading: '5. Uygulanacak hukuk',
            paragraphs: [
                'Uyuşmazlıklarda Türkiye Cumhuriyeti kanunları geçerlidir; yargı yerleri için işlem merkezimizin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir (tüketici işlemlerinde mevzuatın zorunlu hükümleri saklıdır).',
            ],
        },
    ];
}

function sectionsPreInfo() {
    return [
        {
            heading: '1. Satıcı bilgileri',
            paragraphs: [
                `${COMPANY} — iletişim: ${CONTACT_EMAIL}. Güncel ticari bilgiler sipariş onayı ve elektronik ortamda gösterilir.`,
            ],
        },
        {
            heading: '2. Sözleşme konusu',
            paragraphs: [
                'Sipariş özetinde yer alan ürün/hizmetin temel nitelikleri, vergiler dahil toplam fiyat, varsa ek masraflar (kargo) ve ödeme şekli belirtilir.',
            ],
        },
        {
            heading: '3. Cayma hakkı özeti',
            paragraphs: [
                'İlgili mevzuat kapsamındaki tüketici işlemlerinde cayma hakkı süresi ve istisnalar (ör. hijyen/açılmış ürünler) Mesafeli Satış Sözleşmesi ve İade bölümünde düzenlenir.',
            ],
        },
        {
            heading: '4. Uyuşmazlık',
            paragraphs: [
                'Tüketici şikâyetleri için önce satıcı ile iletişim; Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri başvuru yolları saklıdır.',
            ],
        },
    ];
}

function sectionsDistance() {
    return [
        {
            heading: '1. Taraflar',
            paragraphs: [
                `Satıcı: ${COMPANY} — Alıcı: sipariş sırasında beyan edilen kişi.`,
            ],
        },
        {
            heading: '2. Konu ve bedel',
            paragraphs: [
                'Sözleşme konusu, sepetteki ürünler ve ödeme sırasında görülen toplam tutardır. Vergi ve kargo ücreti sipariş ekranında ayrı gösterilir.',
            ],
        },
        {
            heading: '3. Teslimat',
            paragraphs: [
                'Teslimat adresi alıcı tarafından doğru girilmelidir. Gecikmelerde bilgilendirme e-posta veya telefon ile yapılır; mücbir sebeplerden kaynaklanan gecikmelerde sorumluluk kanuni çerçevede değerlendirilir.',
            ],
        },
        {
            heading: '4. Cayma ve iade',
            paragraphs: [
                'Tüketici, ürünün tesliminden itibaren 14 gün içinde cayma hakkını kullanabilir (istisnai ürün grupları mevzuat gereği hariç tutulabilir). İade şartları, ürünün kullanılmamış ve ambalajının uygun olması ile sınırlıdır; kargo ve ücret iadesi süreçleri müşteri hizmetleri tarafından yönetilir.',
            ],
        },
        {
            heading: '5. Uyuşmazlık çözümü',
            paragraphs: [
                'Öncelikle yazılı/mail ile çözüm; uyuşmazlıkta Tüketici Hakem Heyeti ve Tüketici Mahkemeleri yolları açıktır.',
            ],
        },
    ];
}

function sectionsReturnsDetail() {
    return [
        {
            heading: '1. Cayma hakkı',
            paragraphs: [
                'Mesafeli satışlarda, ürünün tesliminden itibaren 14 gün içinde haber vererek cayma hakkınızı kullanabilirsiniz (istisna ürünler ürün sayfasında ve mevzuat gereği hariç tutulur).',
            ],
        },
        {
            heading: '2. İade süreci',
            paragraphs: [
                `İade talebinizi müşteri hizmetlerimize (${CONTACT_EMAIL}) iletin; onay sonrası ürünü talimatlara uygun şekilde gönderin. Ürün kontrolünden sonra ücret iadesi, ödemenin yapıldığı kanala göre işlenir.`,
            ],
        },
        {
            heading: '3. Kargo ve kesintiler',
            paragraphs: [
                'Cayma bildirimi sonrası iade kargo ücreti yasal düzenlemeye ve ürün kategorisine göre belirlenir. Kampanyalı siparişlerde kısmi iade kuralları uygulanabilir.',
            ],
        },
        {
            heading: '4. Ayıplı mal',
            paragraphs: [
                'Tüketicinin Korunması Hakkında Kanun ve ilgili mevzuat hükümleri saklıdır.',
            ],
        },
    ];
}

/** @param {string} slug */
function buildAll() {
    return {
        gizlilik: {
            slug: 'gizlilik',
            title: 'Gizlilik Politikası',
            kind: 'privacy',
            version: legal.PRIVACY_VERSION,
            summary: legal.summaries.privacy,
            sections: sectionsPrivacy(),
        },
        kvkk: {
            slug: 'kvkk',
            title: 'KVKK Aydınlatma Metni',
            kind: 'kvkk',
            version: legal.KVKK_VERSION,
            summary: legal.summaries.kvkk,
            sections: sectionsKvkk(),
        },
        cerez: {
            slug: 'cerez',
            title: 'Çerez Politikası',
            kind: 'cookies',
            version: legal.COOKIE_POLICY_VERSION,
            summary: legal.summaries.cookies,
            sections: sectionsCookies(),
        },
        kullanim: {
            slug: 'kullanim',
            title: 'Kullanım Koşulları',
            kind: 'terms',
            version: legal.TERMS_OF_USE_VERSION,
            summary: legal.summaries.termsOfUse,
            sections: sectionsTerms(),
        },
        'on-bilgilendirme': {
            slug: 'on-bilgilendirme',
            title: 'Ön Bilgilendirme Koşulları',
            kind: 'preInfo',
            version: legal.PRE_INFO_SALES_VERSION,
            summary: legal.summaries.preInfoSales,
            sections: sectionsPreInfo(),
        },
        'mesafeli-satis': {
            slug: 'mesafeli-satis',
            title: 'Mesafeli Satış Sözleşmesi',
            kind: 'distanceSales',
            version: legal.DISTANCE_SALES_VERSION,
            summary: legal.summaries.distanceSales,
            sections: sectionsDistance(),
        },
        iade: {
            slug: 'iade',
            title: 'İade ve İptal Koşulları',
            kind: 'returns',
            version: legal.RETURNS_POLICY_VERSION,
            summary: legal.summaries.returnsPolicy,
            sections: sectionsReturnsDetail(),
        },
    };
}

const bySlug = buildAll();

module.exports = {
    bySlug,
    listSummaries: () =>
        Object.values(bySlug).map((d) => ({
            slug: d.slug,
            title: d.title,
            kind: d.kind,
            version: d.version,
            summary: d.summary,
        })),
};
