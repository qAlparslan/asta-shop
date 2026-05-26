import { Target, Eye } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

function IconBadge({ children }) {
  return (
    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-brand text-white shadow-sm">
      {children}
    </div>
  );
}

const missions = [
  {
    icon: <Target className="h-6 w-6" strokeWidth={2} aria-hidden />,
    title: 'Misyonumuz',
    text:
      'Her müşterimizin kendi cilt tipine uygun, dermatolojik olarak test edilmiş ve etkili ürünlere erişimini sağlamak. Sağlıklı cilt, mutlu hayat anlayışıyla hareket ediyoruz.',
  },
  {
    icon: <Eye className="h-6 w-6" strokeWidth={2} aria-hidden />,
    title: 'Vizyonumuz',
    text:
      "Türkiye'nin en güvenilir ve tercih edilen premium cilt bakım markası olmak. Kalite, bilim ve müşteri memnuniyeti ile sektörde öncü konum elde etmek.",
  },
];

const stats = [
  { value: '120+', label: 'Ürün çeşitliliği' },
  { value: '25+', label: 'Kategori' },
  { value: '24/7', label: 'Müşteri desteği' },
];

export default function AboutPage() {
  const site = useSiteSettings();
  const brand = String(site.storeName || 'Mağazamız').trim() || 'Mağazamız';

  return (
    <>
      {/* Üst — anasayfa hero ile aynı zemin / tipografi tonu */}
      <section className="border-b border-neutral-200 bg-neutral-50/80 pb-14 pt-12 sm:pb-16 sm:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Hakkımızda
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            ASTA TİCARET olarak müşterilerimize %100 orijinal dermokozmetik ürünleri güvenilir, hızlı ve kaliteli 
            hizmet anlayışıyla sunmayı hedefliyoruz. Başta Eucerin olmak üzere seçkin markaların ürünlerini 
            müşterilerimizle buluşturarak cilt bakımında güvenilir alışveriş deneyimi sağlamaktayız.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Müşteri memnuniyetini ön planda tutan hizmet anlayışımız ile güvenli ödeme altyapısı, hızlı kargo ve satış 
            sonrası destek hizmetleri sunuyoruz. Amacımız kaliteli ürünleri uygun fiyat avantajıyla kullanıcılarımıza 
            ulaştırırken profesyonel ve güvenilir bir alışveriş ortamı oluşturmaktır. 
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            ASTA E-TİCARET İTHALAT İHRACAT VE TİC LTD ŞTİ olarak dürüst ticaret, kaliteli hizmet ve müşteri memnuniyeti 
            ilkeleriyle faaliyet göstermeye devam ediyoruz.
          </p>
        </div>
      </section>

      {/* Misyon / Vizyon — footer güven kartları / ürün kartı çizgisi ile uyumlu */}
      <section className="border-y border-neutral-200 bg-neutral-100 py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 md:grid-cols-2 lg:gap-10">
          {missions.map(({ icon, title, text }) => (
            <article
              key={title}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card"
            >
              <div className="h-1.5 bg-brand" aria-hidden />
              <div className="px-8 py-10 text-center">
                <IconBadge>{icon}</IconBadge>
                <h3 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-[15px]">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* İstatistikler — açık zemin + bordo rakamlar (anasayfa CTA rengi) */}
      <section className="border-b border-neutral-200 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Neden {brand}?
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-4xl font-bold tabular-nums text-brand sm:text-[2.5rem]">{value}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
