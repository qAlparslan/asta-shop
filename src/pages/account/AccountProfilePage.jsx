import { useEffect, useState } from 'react';
import { Bell, Lock, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../api/client.js';
import { inputClass, inputErrorClass } from '../../lib/formStyles.js';

function formatConsentAt(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return null;
  }
}

function FieldRow({ id, label, description, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-neutral-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-semibold text-neutral-900">
          {label}
        </label>
        {description ? <p className="mt-1 text-xs leading-relaxed text-neutral-500">{description}</p> : null}
      </div>
      <div className="shrink-0 sm:max-w-xs sm:flex-1 sm:text-right">{children}</div>
    </div>
  );
}

export default function AccountProfilePage() {
  const { user, refreshMe } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConsentOffers, setEmailConsentOffers] = useState(false);
  const [emailConsentNewsletter, setEmailConsentNewsletter] = useState(false);
  const [marketingConsentAt, setMarketingConsentAt] = useState(/** @type {string | null} */ (null));

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdFieldErr, setPwdFieldErr] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setPageLoading(true);
      setLoadError('');
      try {
        const res = await apiFetch('/api/auth/me');
        const u = res?.data?.user;
        if (cancelled || !u) return;
        setFullName(String(u.fullName || ''));
        setEmail(String(u.email || ''));
        setEmailConsentOffers(!!u.emailConsentOffers);
        setEmailConsentNewsletter(!!u.emailConsentNewsletter);
        setMarketingConsentAt(u.marketingConsentAt ? String(u.marketingConsentAt) : null);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Profil yüklenemedi.');
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      const res = await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: {
          fullName: fullName.trim(),
          emailConsentOffers,
          emailConsentNewsletter,
        },
      });
      const u = res?.data?.user;
      if (u) {
        setFullName(String(u.fullName || ''));
        setEmailConsentOffers(!!u.emailConsentOffers);
        setEmailConsentNewsletter(!!u.emailConsentNewsletter);
        setMarketingConsentAt(u.marketingConsentAt ? String(u.marketingConsentAt) : null);
      }
      await refreshMe();
      setProfileMsg('Değişiklikleriniz kaydedildi.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwdErr('');
    setPwdMsg('');
    setPwdFieldErr('');
    if (newPassword.length < 6) {
      setPwdFieldErr('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== newPassword2) {
      setPwdFieldErr('Yeni şifreler eşleşmiyor.');
      return;
    }
    setPwdSaving(true);
    try {
      await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
      setPwdMsg('Şifreniz güncellendi.');
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setPwdSaving(false);
    }
  }

  const consentUpdated = formatConsentAt(marketingConsentAt);

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-8 px-4 sm:px-6">
        {loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
        ) : null}

        {pageLoading ? (
          <p className="text-center text-sm text-neutral-500">Profil yükleniyor…</p>
        ) : (
          <>
            <form
              onSubmit={handleProfileSave}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8"
              noValidate
            >
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <UserCircle className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Profil</h2>
                  <p className="mt-1 text-xs text-neutral-500">Görünen adınız sipariş ve e-postalarda kullanılır.</p>
                </div>
              </div>

              <div className="mt-2">
                <label htmlFor="acc-fullName" className="mt-4 block text-sm font-semibold text-neutral-900">
                  Ad soyad
                </label>
                <input
                  id="acc-fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  className={`${inputClass} mt-2`}
                  maxLength={100}
                />
                <label htmlFor="acc-email" className="mt-5 block text-sm font-semibold text-neutral-900">
                  E-posta
                </label>
                <input
                  id="acc-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  readOnly
                  className="mt-2 w-full cursor-not-allowed rounded-md border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-600"
                />
                <p className="mt-1 text-xs text-neutral-500">E-posta değişikliği için müşteri hizmetleri ile iletişime geçin.</p>
              </div>

              <div className="mt-8 border-t border-neutral-100 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                    <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">İletişim izinleri</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Hangi konularda e-posta almak istediğinizi seçin. Sipariş ve hesap güvenliği ile ilgili zorunlu
                      bildirimler bu ayarlardan etkilenmez.
                    </p>
                    {consentUpdated ? (
                      <p className="mt-2 text-xs text-neutral-400">Son tercih güncellemesi: {consentUpdated}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-neutral-100 bg-neutral-50/50 px-4">
                  <FieldRow
                    id="acc-offers"
                    label="Kampanya ve fırsatlar"
                    description="İndirimler, özel teklifler ve kişiselleştirilmiş ürün önerileri."
                  >
                    <input
                      id="acc-offers"
                      type="checkbox"
                      checked={emailConsentOffers}
                      onChange={(ev) => setEmailConsentOffers(ev.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-asta-maroon focus:ring-asta-maroon/35"
                    />
                  </FieldRow>
                  <FieldRow
                    id="acc-newsletter"
                    label="Bülten ve haberler"
                    description="Yeni ürünler, marka haberleri ve bakım ipuçları."
                  >
                    <input
                      id="acc-newsletter"
                      type="checkbox"
                      checked={emailConsentNewsletter}
                      onChange={(ev) => setEmailConsentNewsletter(ev.target.checked)}
                      className="h-4 w-4 rounded border-neutral-300 text-asta-maroon focus:ring-asta-maroon/35"
                    />
                  </FieldRow>
                </div>
              </div>

              {profileErr ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {profileErr}
                </p>
              ) : null}
              {profileMsg ? (
                <p className="mt-4 text-sm text-green-700" role="status">
                  {profileMsg}
                </p>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-lg bg-asta-maroon px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-asta-maroon-hover disabled:opacity-60"
                >
                  {profileSaving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
              </div>
            </form>

            <form
              onSubmit={handlePasswordSave}
              className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8"
              noValidate
            >
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Şifre</h2>
                  <p className="mt-1 text-xs text-neutral-500">Hesap güvenliğiniz için güçlü bir şifre kullanın.</p>
                </div>
              </div>

              <label htmlFor="acc-current-pw" className="mt-6 block text-sm font-semibold text-neutral-900">
                Mevcut şifre
              </label>
              <input
                id="acc-current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(ev) => setCurrentPassword(ev.target.value)}
                className={`${pwdFieldErr ? inputErrorClass : inputClass} mt-2`}
              />

              <label htmlFor="acc-new-pw" className="mt-4 block text-sm font-semibold text-neutral-900">
                Yeni şifre
              </label>
              <input
                id="acc-new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                className={`${pwdFieldErr ? inputErrorClass : inputClass} mt-2`}
              />

              <label htmlFor="acc-new-pw2" className="mt-4 block text-sm font-semibold text-neutral-900">
                Yeni şifre (tekrar)
              </label>
              <input
                id="acc-new-pw2"
                type="password"
                autoComplete="new-password"
                value={newPassword2}
                onChange={(ev) => setNewPassword2(ev.target.value)}
                className={`${pwdFieldErr ? inputErrorClass : inputClass} mt-2`}
              />

              {pwdFieldErr ? (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {pwdFieldErr}
                </p>
              ) : null}
              {pwdErr ? (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {pwdErr}
                </p>
              ) : null}
              {pwdMsg ? (
                <p className="mt-3 text-sm text-green-700" role="status">
                  {pwdMsg}
                </p>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={pwdSaving || !currentPassword || !newPassword}
                  className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                >
                  {pwdSaving ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
