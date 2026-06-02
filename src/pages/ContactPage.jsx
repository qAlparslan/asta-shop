import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, MessageSquare, Building2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { WhatsAppIcon } from '../components/icons/SocialIcons.jsx';
import { sanitizeSocialUrl } from '../lib/socialLinks.js';

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2';

function footerTelHref(phone) {
  const t = String(phone || '').replace(/[^\d+]/g, '');
  return t ? `tel:${t}` : '';
}

export default function ContactPage() {
  const s = useSiteSettings();
  const [sent, setSent] = useState(false);

  const phone = String(s.footerPhone ?? '').trim();
  const email = String(s.footerEmail ?? '').trim();
  const address = String(s.footerAddress ?? '').trim();
  const legalName = String(s.companyLegalName ?? '').trim();
  const taxOffice = String(s.companyTaxOffice ?? '').trim();
  const taxNumber = String(s.companyTaxNumber ?? '').trim();
  const registeredAddr = String(s.companyRegisteredAddress ?? '').trim();
  const whatsappHref = sanitizeSocialUrl(s.footerWhatsAppUrl);

  const contacts = useMemo(() => {
    /** @type {Array<{ icon: typeof Phone; title: string; lines: Array<{ href?: string; text: string; external?: boolean }> }>} */
    const blocks = [];
    if (phone) {
      const href = footerTelHref(phone);
      blocks.push({
        icon: Phone,
        title: 'Telefon',
        lines: href ? [{ href, text: phone }] : [{ text: phone }],
      });
    }
    if (email) {
      blocks.push({
        icon: Mail,
        title: 'Müşteri iletişim e-postası',
        lines: [{ href: `mailto:${email}`, text: email }],
      });
    }
    if (address) {
      const q = encodeURIComponent(address);
      blocks.push({
        icon: MapPin,
        title: 'Adres',
        lines: [
          {
            href: `https://www.google.com/maps/search/?api=1&query=${q}`,
            text: address,
            external: true,
          },
        ],
      });
    }
    blocks.push({
      icon: Clock,
      title: 'Çalışma saatleri',
      lines: [
        { text: 'Pazartesi — Cuma: 09:00 — 18:00' },
      ],
    });
    return blocks;
  }, [phone, email, address]);

  const hasLegalBlock = Boolean(legalName || taxOffice || taxNumber || registeredAddr);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    e.target.reset();
    window.setTimeout(() => setSent(false), 6000);
  };

  return (
    <>
      <section className="border-b border-neutral-200 bg-neutral-50/80 pb-12 pt-12 sm:pb-14 sm:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            İletişim
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            Sipariş, ürün veya iş birliği talepleriniz için aşağıdaki kanallardan bize ulaşabilirsiniz.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="space-y-4 lg:col-span-5">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 p-5 shadow-card transition-colors hover:bg-[#25D366]/15 sm:p-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white">
                  <WhatsAppIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-neutral-900">WhatsApp iletişim hattı</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Hızlı soru ve sipariş takibi için WhatsApp üzerinden bize yazın.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1fb457]">
                    WhatsApp&apos;tan yaz →
                  </span>
                </div>
              </a>
            ) : null}

            {contacts.map(({ icon: Icon, title, lines }) => (
              <div
                key={title}
                className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                    {lines.map((line, i) => (
                      <li key={`${title}-${i}-${line.text.slice(0, 20)}`}>
                        {line.href ? (
                          <a
                            href={line.href}
                            {...(line.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            className="transition-colors hover:text-brand"
                          >
                            {line.text}
                          </a>
                        ) : (
                          line.text
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}

            {hasLegalBlock ? (
              <div className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-asta-navy/10 text-asta-navy">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0 text-sm text-neutral-700">
                  <h2 className="text-sm font-bold text-neutral-900">Şirkete ilişkin yasal bilgiler</h2>
                  <dl className="mt-3 space-y-2">
                    {legalName ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          Ticari ünvan
                        </dt>
                        <dd className="mt-0.5 leading-snug">{legalName}</dd>
                      </div>
                    ) : null}
                    {registeredAddr ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          Yasal adres
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-line leading-snug">{registeredAddr}</dd>
                      </div>
                    ) : null}
                    {taxOffice ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          Vergi dairesi
                        </dt>
                        <dd className="mt-0.5">{taxOffice}</dd>
                      </div>
                    ) : null}
                    {taxNumber ? (
                      <div>
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                          Vergi numarası (VKN)
                        </dt>
                        <dd className="mt-0.5 tabular-nums">{taxNumber}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            ) : null}

            <p className="text-xs leading-relaxed text-neutral-500">
              Acil sipariş bildirimi için mesai saatleri içinde telefon hattımızı arayınız.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
              <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
                <MessageSquare className="h-5 w-5 text-brand" strokeWidth={2} aria-hidden /> Mesaj bırakın
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                Aşağıdaki form üzerinden talebinizi iletebilirsiniz.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="contact-name" className="sr-only">
                    Ad soyad
                  </label>
                  <input id="contact-name" name="name" required placeholder="Ad soyad *" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="contact-email" className="sr-only">
                    E-posta
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="E-posta adresiniz *"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="sr-only">
                    Konu
                  </label>
                  <input id="contact-subject" name="subject" required placeholder="Konu *" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="contact-message" className="sr-only">
                    Mesaj
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    className={`${inputClass} resize-y min-h-[120px]`}
                    placeholder="Mesajınızı buraya yazın..."
                  />
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">
                  Kişisel verileriniz{' '}
                  <Link to="/yasal/gizlilik" className="font-medium text-brand hover:text-brand-hover">
                    gizlilik politikamız
                  </Link>{' '}
                  kapsamında işlenir.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover sm:w-auto"
                >
                  Gönder
                </button>
                {sent ? (
                  <p className="text-sm font-medium text-green-700">
                    Talebiniz kayda alınmıştır; en kısa sürede tarafınıza dönüş sağlanacaktır.
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
