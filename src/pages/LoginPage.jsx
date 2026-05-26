import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { inputClass, inputErrorClass } from '../lib/formStyles.js';
import { useAuth } from '../context/AuthContext.jsx';

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const next = {};

    const em = email.trim();
    if (!em) next.email = 'E-posta adresinizi girin.';
    else if (!isValidEmail(em)) next.email = 'Geçerli bir e-posta adresi girin.';

    if (!password) next.password = 'Şifrenizi girin.';
    else if (password.length < 8) next.password = 'Şifre en az 8 karakter olmalıdır.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const logged = await login(em, password, remember);
      const redirectRaw = searchParams.get('redirect');
      const redirect =
        redirectRaw && redirectRaw.startsWith('/') && !redirectRaw.startsWith('//')
          ? redirectRaw
          : '/';

      if (redirect.startsWith('/admin') && logged?.role !== 'admin') {
        setServerError('Yönetici paneli için yönetici hesabıyla giriş yapın.');
        navigate('/', { replace: true });
        return;
      }

      navigate(redirect, { replace: true });
    } catch (err) {
      setServerError(err?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-neutral-200 bg-neutral-50/80 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
        <div className="shrink-0 text-center lg:max-w-md lg:flex-1 lg:text-left">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Giriş yap
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600 lg:mx-0">
            Hesabınıza giriş yaparak siparişlerinizi takip edebilir ve adres bilgilerinizi yönetebilirsiniz.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg lg:flex-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <LogIn className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
              Üye girişi
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Hesabınız yok mu?{' '}
              <Link to="/uye-ol" className="font-semibold text-brand hover:text-brand-hover">
                Üye olun
              </Link>
            </p>

            {serverError && (
              <div
                className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                role="alert"
              >
                {serverError}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700">
                  E-posta <span className="text-brand">*</span>
                </label>
                <input
                  id="login-email"
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
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
                    Şifre <span className="text-brand">*</span>
                  </label>
                  <Link
                    to="/sifre-unuttum"
                    className="text-xs font-medium text-neutral-600 underline underline-offset-2 hover:text-brand"
                  >
                    Şifremi unuttum
                  </Link>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => {
                    setPassword(ev.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: '' }));
                  }}
                  className={`${errors.password ? inputErrorClass : inputClass} mt-1.5`}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="login-remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(ev) => setRemember(ev.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                />
                <label htmlFor="login-remember" className="text-sm text-neutral-700">
                  Beni hatırla
                </label>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
              </button>
            </form>

            <p className="mt-6 border-t border-neutral-100 pt-6 text-xs leading-relaxed text-neutral-500">
              Güvenlik için güçlü ve benzersiz bir şifre kullanın. Hesap güvenliğinizle ilgili gelişmeler için{' '}
              <Link to="/iletisim" className="font-medium text-brand hover:text-brand-hover">
                iletişim
              </Link>{' '}
              sayfamızdan bize ulaşabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
