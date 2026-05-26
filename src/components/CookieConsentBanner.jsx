import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { getOrCreateVisitorKey } from '../lib/visitorKey.js';

const STORAGE = 'asta_cookie_consent_v2';

/**
 * Çerez tercihi + politikası sürümü (metin güncellenince banner tekrar çıkar).
 */
function readStoredConsent(cookiePolicyVersion) {
  try {
    const raw = window.localStorage.getItem(STORAGE);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j || j.cookiePolicyVersion !== cookiePolicyVersion) return null;
    return j;
  } catch {
    return null;
  }
}

function writeStoredConsent(payload) {
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify(payload));
  } catch {
    /* no-op */
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  /** @type {null | { privacyVersion: string; kvkkVersion: string; cookiePolicyVersion: string; termsOfUseVersion: string }} */
  const [versions, setVersions] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch('/api/legal/versions', { skipAuth: true, signal: ac.signal })
      .then((res) => {
        const v = res?.data;
        if (!v?.cookiePolicyVersion) return;
        setVersions({
          privacyVersion: String(v.privacyVersion),
          kvkkVersion: String(v.kvkkVersion),
          cookiePolicyVersion: String(v.cookiePolicyVersion),
          termsOfUseVersion: String(v.termsOfUseVersion),
        });
        const existing = readStoredConsent(String(v.cookiePolicyVersion));
        setVisible(!existing);
      })
      .catch(() => setVisible(true))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const submitConsent = async (analyticsEnabled) => {
    if (!versions) return;
    const visitorKey = getOrCreateVisitorKey();
    try {
      await apiFetch('/api/consent/events', {
        method: 'POST',
        skipAuth: true,
        body: {
          visitorKey,
          channel: 'cookie_banner',
          privacyVersion: versions.privacyVersion,
          kvkkVersion: versions.kvkkVersion,
          cookiePolicyVersion: versions.cookiePolicyVersion,
          termsOfUseVersion: versions.termsOfUseVersion,
          cookiePreferences: {
            essential: true,
            analytics: !!analyticsEnabled,
          },
          collectionMethod: analyticsEnabled ? 'cookie_banner_accept_all' : 'cookie_banner_essential_only',
        },
      });
    } catch {
      /* yine de istemci tarafında tercihi sakla */
    }
    writeStoredConsent({
      cookiePolicyVersion: versions.cookiePolicyVersion,
      essential: true,
      analytics: !!analyticsEnabled,
      at: new Date().toISOString(),
    });
    setVisible(false);
  };

  if (loading || !visible || !versions) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-neutral-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md sm:p-5"
      role="dialog"
      aria-label="Çerez tercihleri"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 text-sm leading-relaxed text-neutral-700">
          <p className="font-semibold text-asta-navy">Çerez ve gizlilik</p>
          <p className="mt-2">
            Sitemizi çalıştırmak için zorunlu çerezler kullanıyoruz. İsterseniz performans/analitik çerezlerine
            izin verebilirsiniz.{' '}
            <Link to="/yasal/cerez" className="font-semibold text-brand hover:text-brand-hover">
              Çerez politikası
            </Link>
            ,{' '}
            <Link to="/yasal/gizlilik" className="font-semibold text-brand hover:text-brand-hover">
              gizlilik
            </Link>{' '}
            ve{' '}
            <Link to="/yasal/kvkk" className="font-semibold text-brand hover:text-brand-hover">
              KVKK metni
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => submitConsent(false)}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Yalnızca zorunlu
          </button>
          <button
            type="button"
            onClick={() => submitConsent(true)}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            Tümünü kabul et
          </button>
        </div>
      </div>
    </div>
  );
}
