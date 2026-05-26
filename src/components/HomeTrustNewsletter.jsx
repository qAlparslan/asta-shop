import { useState } from 'react';
import {
  IconSecureBagHeart,
  IconOriginalShield,
  IconEasyReturn,
  IconHeadsetOutline,
  IconNewsletterEnvelope,
} from './icons/FooterFeatureIcons.jsx';
import { apiFetch } from '../api/client.js';

const trustItems = [
  {
    Icon: IconSecureBagHeart,
    title: 'Güvenli Alışveriş',
    sub: '256-bit SSL ile korunur',
  },
  {
    Icon: IconOriginalShield,
    title: 'Orijinal Ürün Garantisi',
    sub: '%100 Eucerin Ürünleri',
  },
  {
    Icon: IconEasyReturn,
    title: 'Kolay İade',
    sub: '14 gün içinde iade hakkı',
  },
  {
    Icon: IconHeadsetOutline,
    title: '7/24 Müşteri Desteği',
    sub: 'Her zaman yanınızdayız',
  },
];

/** Güven özeti + bülten — yalnızca anasayfa; footer’da tekrarlanmaz */
export default function HomeTrustNewsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    const em = email.trim();
    if (!em) {
      setStatus({ kind: 'err', text: 'E-posta adresinizi girin.' });
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/api/newsletter/subscribe', {
        method: 'POST',
        skipAuth: true,
        body: { email: em, source: 'home-trust-newsletter' },
      });
      if (res?.alreadyActive) {
        setStatus({ kind: 'ok', text: res.message || 'Bu e-posta zaten kayıtlı. Teşekkürler!' });
      } else {
        setStatus({
          kind: 'ok',
          text:
            res?.message ||
            'Onay e-postası gönderildi. Linke tıklayarak aboneliğinizi tamamlayabilirsiniz.',
        });
      }
      setEmail('');
    } catch (err) {
      setStatus({ kind: 'err', text: err.message || 'Abonelik oluşturulamadı.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-neutral-200 bg-neutral-50 py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 xl:gap-10">
            {trustItems.map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-4">
                <Icon className="h-14 w-14 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]" />
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-black">{title}</p>
                  <p className="mt-1 text-xs font-normal leading-snug text-neutral-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-neutral-200 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex max-w-xl flex-shrink-0 items-start gap-4">
              <IconNewsletterEnvelope className="h-14 w-14 shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]" />
              <div>
                <p className="text-sm font-bold leading-snug text-black sm:text-base">
                  Kampanyalardan ve yeniliklerden haberdar olun!
                </p>
                <p className="mt-1 text-xs font-normal leading-relaxed text-neutral-500 sm:text-sm">
                  E-bültenimize abone olun, özel fırsatları kaçırmayın.
                </p>
              </div>
            </div>
            <form
              className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch lg:max-w-xl lg:flex-1"
              onSubmit={handleSubmit}
            >
              <label htmlFor="news-email-home" className="sr-only">
                E-posta adresiniz
              </label>
              <input
                id="news-email-home"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="E-posta adresinizi girin..."
                value={email}
                onChange={(ev) => {
                  setEmail(ev.target.value);
                  if (status) setStatus(null);
                }}
                className="min-h-[46px] min-w-[180px] flex-1 rounded-md border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2"
              />
              <button
                type="submit"
                disabled={busy}
                className="min-h-[46px] shrink-0 rounded-md bg-brand px-8 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400 sm:px-10"
              >
                {busy ? 'Gönderiliyor…' : 'ABONE OL'}
              </button>
              {status && (
                <p
                  className={`w-full text-sm leading-snug ${
                    status.kind === 'ok' ? 'text-green-800' : 'text-red-700'
                  }`}
                  role="status"
                >
                  {status.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
