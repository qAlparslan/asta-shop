import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { inputClass, inputErrorClass } from '../lib/formStyles.js';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [offersConsent, setOffersConsent] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);

  /** @type {null | Record<string,string>} */
  const [legal, setLegal] = useState(null);
  const [legalError, setLegalError] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setLegalError('');
    apiFetch('/api/legal/versions', { skipAuth: true, signal: ac.signal })
      .then((res) => {
        const v = res?.data;
        if (
          !v?.privacyVersion ||
          !v?.kvkkVersion ||
          !v?.cookiePolicyVersion ||
          !v?.termsOfUseVersion
        ) {
          throw new Error('Yasal sürüm bilgisi eksik.');
        }
        setLegal({
          privacyVersion: String(v.privacyVersion),
          kvkkVersion: String(v.kvkkVersion),
          cookiePolicyVersion: String(v.cookiePolicyVersion),
          termsOfUseVersion: String(v.termsOfUseVersion),
        });
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setLegalError(e?.message || 'Yasal metinler yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
        }
      });
    return () => ac.abort();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const next = {};

    if (!firstName.trim()) next.firstName = 'Adınızı girin.';
    if (!lastName.trim()) next.lastName = 'Soyadınızı girin.';

    const em = email.trim();
    if (!em) next.email = 'E-posta adresinizi girin.';
    else if (!isValidEmail(em)) next.email = 'Geçerli bir e-posta adresi girin.';

    if (!password) next.password = 'Şifrenizi oluşturun.';
    else if (password.length < 8)
      next.password = 'Şifre en az 8 karakter olsun; harf ve rakam karışımı önerilir.';

    if (!passwordAgain) next.passwordAgain = 'Şifreyi tekrar yazın.';
    else if (password !== passwordAgain) next.passwordAgain = 'Şifreler eşleşmiyor.';

    if (!acceptedTerms) next.terms = 'Üyelik için sözleşmeyi onaylamanız gerekir.';
    if (!legal) next.terms = legalError || next.terms || 'Yasal sürüm bilgisi yükleniyor…';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const anyMarketing = offersConsent || newsletterConsent;
      await register(
        {
          fullName,
          email: em,
          password,
          privacyVersion: legal.privacyVersion,
          kvkkVersion: legal.kvkkVersion,
          cookiePolicyVersion: legal.cookiePolicyVersion,
          termsOfUseVersion: legal.termsOfUseVersion,
          visitorKey: null,
          marketingConsent: anyMarketing,
          emailConsentOffers: offersConsent,
          emailConsentNewsletter: newsletterConsent,
        },
        true,
      );
      navigate('/');
    } catch (err) {
      setServerError(err?.message || 'Kayıt tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-neutral-200 bg-neutral-50/80 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:flex-row-reverse lg:items-center lg:gap-12 xl:gap-16">
        <div className="flex shrink-0 flex-col items-center text-center lg:max-w-md lg:flex-1">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Üye ol
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600">
            Birkaç bilgi ile üye olun; indirimlerden ve sipariş takibinden yararlanın.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-xl lg:flex-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <UserPlus className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
              Yeni üyelik
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Zaten üye misiniz?{' '}
              <Link to="/giris" className="font-semibold text-brand hover:text-brand-hover">
                Giriş yapın
              </Link>
            </p>

            {legalError && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {legalError}{' '}
                <button
                  type="button"
                  className="font-semibold underline hover:no-underline"
                  onClick={() => window.location.reload()}
                >
                  Sayfayı yenile
                </button>
              </div>
            )}

            {serverError && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {serverError}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-firstname" className="block text-sm font-medium text-neutral-700">
                    Ad <span className="text-brand">*</span>
                  </label>
                  <input
                    id="reg-firstname"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(ev) => {
                      setFirstName(ev.target.value);
                      if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' }));
                    }}
                    className={`${errors.firstName ? inputErrorClass : inputClass} mt-1.5`}
                  />
                  {errors.firstName && <p className="mt-1.5 text-xs text-red-600">{errors.firstName}</p>}
                </div>
                <div>
                  <label htmlFor="reg-lastname" className="block text-sm font-medium text-neutral-700">
                    Soyad <span className="text-brand">*</span>
                  </label>
                  <input
                    id="reg-lastname"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(ev) => {
                      setLastName(ev.target.value);
                      if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' }));
                    }}
                    className={`${errors.lastName ? inputErrorClass : inputClass} mt-1.5`}
                  />
                  {errors.lastName && <p className="mt-1.5 text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-700">
                  E-posta <span className="text-brand">*</span>
                </label>
                <input
                  id="reg-email"
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
                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-700">
                  Şifre <span className="text-brand">*</span>
                </label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => {
                    setPassword(ev.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: '' }));
                  }}
                  className={`${errors.password ? inputErrorClass : inputClass} mt-1.5`}
                  placeholder="En az 8 karakter"
                />
                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="reg-password2" className="block text-sm font-medium text-neutral-700">
                  Şifre tekrar <span className="text-brand">*</span>
                </label>
                <input
                  id="reg-password2"
                  name="passwordAgain"
                  type="password"
                  autoComplete="new-password"
                  value={passwordAgain}
                  onChange={(ev) => {
                    setPasswordAgain(ev.target.value);
                    if (errors.passwordAgain) setErrors((p) => ({ ...p, passwordAgain: '' }));
                  }}
                  className={`${errors.passwordAgain ? inputErrorClass : inputClass} mt-1.5`}
                  placeholder="Şifreyi tekrar girin"
                />
                {errors.passwordAgain && <p className="mt-1.5 text-xs text-red-600">{errors.passwordAgain}</p>}
              </div>

              <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-4">
                <p className="text-xs font-semibold text-neutral-700">İletişim tercihleri (isteğe bağlı)</p>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    checked={offersConsent}
                    onChange={(ev) => setOffersConsent(ev.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  <span>Kampanya ve avantaj bildirimlerini e-posta ile almak istiyorum.</span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    checked={newsletterConsent}
                    onChange={(ev) => setNewsletterConsent(ev.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  <span>Bülten ve yenilik yazılarını istiyorum.</span>
                </label>
              </div>

              <div>
                <div className="flex items-start gap-3">
                  <input
                    id="reg-terms"
                    name="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(ev) => {
                      setAcceptedTerms(ev.target.checked);
                      if (errors.terms) setErrors((p) => ({ ...p, terms: '' }));
                    }}
                    disabled={!legal}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-brand focus:ring-brand disabled:opacity-60"
                  />
                  <label htmlFor="reg-terms" className="text-sm leading-snug text-neutral-700">
                    <span className="text-brand">*</span>{' '}
                    <Link to="/yasal/kullanim" className="font-semibold text-brand hover:text-brand-hover">
                      Kullanım koşulları
                    </Link>
                    ’nı,{' '}
                    <Link to="/yasal/gizlilik" className="font-semibold text-brand hover:text-brand-hover">
                      gizlilik politikasını
                    </Link>{' '}
                    ve{' '}
                    <Link to="/yasal/kvkk" className="font-semibold text-brand hover:text-brand-hover">
                      KVKK aydınlatma metnini
                    </Link>{' '}
                    okudum, onaylıyorum.
                  </label>
                </div>
                {errors.terms && <p className="mt-2 text-xs text-red-600">{errors.terms}</p>}
              </div>

              <button
                type="submit"
                disabled={busy || !legal || Boolean(legalError)}
                className="w-full rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {busy ? 'Kaydediliyor…' : 'Üye ol'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
