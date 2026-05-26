import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { inputClass, inputErrorClass } from '../lib/formStyles.js';
import { apiFetch } from '../api/client.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const rawToken = typeof token === 'string' ? token.trim() : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const next = {};

    if (!rawToken) {
      setServerError('Geçersiz bağlantı. E-postanızdaki linki kullanın.');
      return;
    }

    if (!password || password.length < 6) next.password = 'Yeni şifre en az 6 karakter olmalıdır.';
    if (!passwordAgain) next.passwordAgain = 'Şifreyi tekrar yazın.';
    else if (password !== passwordAgain) next.passwordAgain = 'Şifreler eşleşmiyor.';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: { token: rawToken, newPassword: password },
      });
      const msg =
        typeof res?.message === 'string' ? res.message : 'Şifreniz güncellendi. Yönlendiriliyorsunuz…';
      setSuccessMsg(msg);
      window.setTimeout(() => navigate('/giris', { replace: true }), 2000);
    } catch (err) {
      setServerError(typeof err.message === 'string' ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setBusy(false);
    }
  };

  if (!rawToken && !successMsg) {
    return (
      <section className="border-b border-neutral-200 bg-neutral-50/80 py-12">
        <div className="mx-auto max-w-md px-4 text-center">
          <p className="text-sm text-red-800">Şifre sıfırlama bağlantısı eksik.</p>
          <Link to="/sifre-unuttum" className="mt-4 inline-block font-semibold text-brand hover:text-brand-hover">
            Şifremi unuttum
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-neutral-200 bg-neutral-50/80 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
        <div className="shrink-0 text-center lg:max-w-md lg:flex-1 lg:text-left">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Yeni şifre oluştur
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-600 lg:mx-0">
            E-postadaki bağlantının süresi sınırlıdır. Güçlü ve benzersiz bir şifre seçin.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg lg:flex-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-900">
              <KeyRound className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden />
              Şifreyi sıfırla
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              <Link to="/giris" className="font-semibold text-brand hover:text-brand-hover">
                Giriş sayfası
              </Link>
            </p>

            {successMsg ? (
              <div
                className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-950"
                role="status"
              >
                {successMsg}
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

            {!successMsg ? (
              <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="reset-pw1" className="block text-sm font-medium text-neutral-700">
                    Yeni şifre <span className="text-brand">*</span>
                  </label>
                  <input
                    id="reset-pw1"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(ev) => {
                      setPassword(ev.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: '' }));
                    }}
                    className={`${errors.password ? inputErrorClass : inputClass} mt-1.5`}
                  />
                  {errors.password ? <p className="mt-1.5 text-xs text-red-600">{errors.password}</p> : null}
                </div>
                <div>
                  <label htmlFor="reset-pw2" className="block text-sm font-medium text-neutral-700">
                    Yeni şifre (tekrar) <span className="text-brand">*</span>
                  </label>
                  <input
                    id="reset-pw2"
                    name="newPasswordAgain"
                    type="password"
                    autoComplete="new-password"
                    value={passwordAgain}
                    onChange={(ev) => {
                      setPasswordAgain(ev.target.value);
                      if (errors.passwordAgain) setErrors((p) => ({ ...p, passwordAgain: '' }));
                    }}
                    className={`${errors.passwordAgain ? inputErrorClass : inputClass} mt-1.5`}
                  />
                  {errors.passwordAgain ? (
                    <p className="mt-1.5 text-xs text-red-600">{errors.passwordAgain}</p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={busy || !rawToken}
                  className="w-full rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-400"
                >
                  {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
