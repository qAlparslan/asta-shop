import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { inputClass, inputErrorClass } from '../lib/formStyles.js';
import { apiFetch } from '../api/client.js';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sentMsg, setSentMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSentMsg('');
    const next = {};
    const em = email.trim();
    if (!em) next.email = 'E-posta adresinizi girin.';
    else if (!isValidEmail(em)) next.email = 'Geçerli bir e-posta adresi girin.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: { email: em },
      });
      setSentMsg(typeof res?.message === 'string' ? res.message : 'İsteğiniz alındı.');
    } catch (err) {
      setServerError(typeof err.message === 'string' ? err.message : 'İşlem yapılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-neutral-200 bg-neutral-50/80 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
        <div className="shrink-0 text-center lg:max-w-md lg:flex-1 lg:text-left">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Şifremi unuttum
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600 lg:mx-0">
            Hesabınızda kayıtlı e-posta adresini girin; bağlantıyı gönderebilirsek kutunuza iletilir (spam
            klasörünü de kontrol edin).
          </p>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg lg:flex-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <Mail className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
              Yeni şifre bağlantısı
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              <Link to="/giris" className="font-semibold text-brand hover:text-brand-hover">
                Giriş sayfasına dön
              </Link>
            </p>

            {sentMsg ? (
              <div
                className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950"
                role="status"
              >
                {sentMsg}
              </div>
            ) : null}

            {serverError ? (
              <div
                className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                role="alert"
              >
                {serverError}
              </div>
            ) : null}

            {!sentMsg ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-neutral-700">
                    E-posta <span className="text-brand">*</span>
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: '' }));
                    }}
                    className={`${errors.email ? inputErrorClass : inputClass} mt-1.5`}
                    placeholder="ornek@eposta.com"
                  />
                  {errors.email ? <p className="mt-1.5 text-xs text-red-600">{errors.email}</p> : null}
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
                >
                  {busy ? 'Gönderiliyor…' : 'Bağlantı gönder'}
                </button>
              </form>
            ) : (
              <p className="mt-6 text-sm text-neutral-600">
                Farklı bir adres denemek için{' '}
                <button
                  type="button"
                  className="font-semibold text-brand hover:text-brand-hover"
                  onClick={() => {
                    setSentMsg('');
                    setEmail('');
                  }}
                >
                  formu sıfırlayın
                </button>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
