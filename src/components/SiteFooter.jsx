import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import SocialLinksGroup from './SocialLinksGroup.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { LEGAL_DOCUMENT_LINKS, legalDocHref } from '../lib/legalDocLinks.js';
import { mediaUrl } from '../lib/mediaUrl.js';

const footerLink = 'text-sm text-neutral-600 transition-colors hover:text-brand';

function footerTelHref(phone) {
  const t = String(phone || '').replace(/[^\d+]/g, '');
  return t ? `tel:${t}` : '';
}

export default function SiteFooter() {
  const s = useSiteSettings();
  const storeName = String(s.storeName ?? 'Asta Ticaret').trim() || 'Asta Ticaret';
  const tagline =
    String(s.storeTagline ?? '').trim() ||
    'Eucerin ve dermatolojik bakım ürünlerinde güvenilir adresiniz. Orijinal ürün, hızlı kargo ve uzman destek.';
  const rawAddr = String(s.footerAddress ?? '').trim();
  const footerAddressConfigured = Boolean(rawAddr);
  const footerEmail = String(s.footerEmail ?? '').trim();
  const footerPhone = String(s.footerPhone ?? '').trim();
  const telHref = footerTelHref(footerPhone);
  const mailHref = footerEmail ? `mailto:${footerEmail}` : '';
  const year = new Date().getFullYear();
  const phoneFallbackHref = `tel:+902121234567`;
  const mailFallbackHref = 'mailto:destek@example.com';
  const addressLines = footerAddressConfigured
    ? rawAddr.split(/\r?\n/).filter((ln) => ln.trim())
    : ['Örnek Mah. Ticaret Cad. No:1', 'İstanbul'];

  const displayEmail = footerEmail || 'destek@example.com';
  const displayPhone = footerPhone || '+90 (212) 123 45 67';

  const showPaymentCards =
    s.footerTrustShowPaymentCards !== false && s.footerTrustShowPaymentCards !== 'false';
  const visaSrc = mediaUrl(String(s.footerTrustVisaUrl ?? '').trim()) || '/payments/visa.svg';
  const mcSrc = mediaUrl(String(s.footerTrustMastercardUrl ?? '').trim()) || '/payments/mastercard.svg';
  const troySrc = mediaUrl(String(s.footerTrustTroyUrl ?? '').trim()) || '/payments/troy.png';
  const sslUrl = String(s.footerTrustSslUrl ?? '').trim();
  const sslSrc = sslUrl ? mediaUrl(sslUrl) : '';
  const carrierUrl = String(s.footerTrustCarrierUrl ?? '').trim();
  const carrierSrc = carrierUrl ? mediaUrl(carrierUrl) : '';
  const carrierAlt = String(s.footerTrustCarrierLabel ?? '').trim() || 'Kargo ortaklığı';

  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="bg-white py-12 pt-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-start lg:gap-10 lg:px-8">
          <div className="mx-auto shrink-0 lg:mx-0 lg:max-w-[240px] xl:max-w-[260px]">
            <img
              src="/trust/resmi-ithalatci.png"
              alt="Asta Ticaret resmi ithalatçı — %100 orijinal ürün, resmi fatura ile gönderim, güvenli alışveriş garantisi"
              className="h-auto w-full max-w-[240px] object-contain xl:max-w-[260px]"
              width={260}
              height={520}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="grid min-w-0 flex-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <p className="text-lg font-bold tracking-tight text-neutral-900 uppercase">{storeName}</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{tagline}</p>
            <SocialLinksGroup
              wrapperClass="mt-4 flex gap-3 text-neutral-600"
              linkClass="transition-colors hover:text-brand"
              iconClass="h-5 w-5"
            />
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900">Kurumsal</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/hakkimizda" className={footerLink}>
                  Hakkımızda
                </Link>
              </li>
              {LEGAL_DOCUMENT_LINKS.map(({ slug, label }) => (
                <li key={slug}>
                  <Link to={legalDocHref(slug)} className={footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900">Kategoriler</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/urunler" className={footerLink}>
                  Tüm ürünler
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900">
              Müşteri hizmetleri &amp; iletişim
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/hesabim/siparisler" className={footerLink}>
                  Siparişlerim
                </Link>
              </li>
              <li>
                <Link to="/hesabim" className={footerLink}>
                  Hesabım
                </Link>
              </li>
              <li>
                <Link to="/iletisim" className={footerLink}>
                  İletişim
                </Link>
              </li>
              <li>
                <a href={telHref || phoneFallbackHref} className={footerLink}>
                  {displayPhone}
                </a>
              </li>
              <li>
                <a href={mailHref || mailFallbackHref} className={footerLink}>
                  {displayEmail}
                </a>
              </li>
              <li className="text-sm text-neutral-600">
                {addressLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < addressLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </li>
            </ul>
          </div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            {showPaymentCards ? (
              <>
                <img
                  src={visaSrc}
                  alt="Visa"
                  className="h-5 w-auto sm:h-6"
                  width={48}
                  height={20}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src={mcSrc}
                  alt="Mastercard"
                  className="h-6 w-auto sm:h-7"
                  width={52}
                  height={32}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  src={troySrc}
                  alt="Troy"
                  className="h-7 w-auto object-contain sm:h-8"
                  loading="lazy"
                  decoding="async"
                />
              </>
            ) : null}
            {sslSrc ? (
              <img
                src={sslSrc}
                alt="Güvenli alışveriş"
                className="h-8 w-auto max-w-[140px] object-contain sm:h-9"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">
                <ShieldCheck className="h-5 w-5 text-green-700" strokeWidth={2} aria-hidden />
                <span>256‑bit SSL ile şifreli bağlantı</span>
              </div>
            )}
            {carrierSrc ? (
              <img
                src={carrierSrc}
                alt={carrierAlt}
                className="h-8 w-auto max-w-[160px] object-contain sm:h-9"
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span>
              © {year} {storeName}. Tüm hakları saklıdır.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
