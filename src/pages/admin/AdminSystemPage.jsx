import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  Wrench,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { assetUrl } from '../../config/api.js';
import { inputClass } from '../../lib/formStyles.js';
import { SYSTEM_SECTION_IDS, SYSTEM_SECTIONS } from './systemSectionConfig.js';
import AdminCampaignPanel from './AdminCampaignPanel.jsx';
import SkinFilterCatalogPanel from './SkinFilterCatalogPanel.jsx';
import AdminHeroPanel from './AdminHeroPanel.jsx';
import AdminLegalDocumentsPanel from './AdminLegalDocumentsPanel.jsx';

const STORE_KEYS = [
  'storeName',
  'storeTagline',
  'footerEmail',
  'footerPhone',
  'footerAddress',
  'footerInstagramUrl',
  'footerFacebookUrl',
  'footerTwitterUrl',
  'footerWhatsAppUrl',
  'companyLegalName',
  'companyTaxOffice',
  'companyTaxNumber',
  'companyRegisteredAddress',
  'footerTrustShowPaymentCards',
  'footerTrustVisaUrl',
  'footerTrustMastercardUrl',
  'footerTrustTroyUrl',
  'footerTrustSslUrl',
  'footerTrustCarrierUrl',
  'footerTrustCarrierLabel',
];

const STORE_BOOLEAN_KEYS = new Set(['footerTrustShowPaymentCards']);
const SHIP_KEYS = [
  'shippingFeeEnabled',
  'standardShippingFee',
  'freeShippingEnabled',
  'freeShippingThreshold',
];

/** @typedef {{ id: string; name: string; slug: string; displayOrder: number; isActive: boolean }} CategoryRow */

export default function AdminSystemPage() {
  const { bolum } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsLoadErr, setSettingsLoadErr] = useState('');

  const loadSettings = useCallback(() => {
    setSettingsLoading(true);
    setSettingsLoadErr('');
    return apiFetch('/api/settings', { skipAuth: true })
      .then((res) => setSettings(res?.data?.settings || {}))
      .catch((e) => setSettingsLoadErr(e.message || 'Ayarlar yüklenemedi.'))
      .finally(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!bolum || !SYSTEM_SECTION_IDS.has(bolum)) {
      navigate('/admin/sistem/kategoriler', { replace: true });
    }
  }, [bolum, navigate]);

  const setField = useCallback((k, v) => {
    setSettings((s) => ({ ...s, [k]: v }));
  }, []);

  if (!bolum || !SYSTEM_SECTION_IDS.has(bolum)) {
    return null;
  }

  const meta = SYSTEM_SECTIONS.find((s) => s.id === bolum) ?? SYSTEM_SECTIONS[0];

  return (
    <div className="space-y-6">
      {bolum !== 'bakim-modu' ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sistem</p>
          <h2 className="text-xl font-bold text-asta-navy">{meta.label}</h2>
          {meta.hint ? <p className="mt-1 text-sm text-neutral-600">{meta.hint}</p> : null}
        </div>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sistem</p>
      )}

      {settingsLoadErr ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {settingsLoadErr}{' '}
          <button type="button" className="font-semibold underline" onClick={() => loadSettings()}>
            Yeniden dene
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 sm:p-6">
        <SectionContent
          sectionId={bolum}
          settings={settings}
          settingsLoading={settingsLoading}
          setField={setField}
          onSettingsSaved={(next) => setSettings(next ?? {})}
        />
      </div>
    </div>
  );
}

export function AdminSystemSectionRedirect({ to = '/admin/sistem/kategoriler' }) {
  return <Navigate to={to} replace />;
}

function SectionContent({ sectionId, settings, settingsLoading, setField, onSettingsSaved }) {
  switch (sectionId) {
    case 'kategoriler':
      return (
        <CategoryManagementPanel
          skinFilterRaw={settings.skinFilterOptions}
          onSettingsCommitted={onSettingsSaved}
        />
      );
    case 'magaza-bilgileri':
      return (
        <StoreInfoForm
          settings={settings}
          settingsLoading={settingsLoading}
          setField={setField}
          onSettingsSaved={onSettingsSaved}
        />
      );
    case 'kargo-vergi':
      return (
        <ShippingSettingsForm
          settings={settings}
          settingsLoading={settingsLoading}
          setField={setField}
          onSettingsSaved={onSettingsSaved}
        />
      );
    case 'kampanyalar':
      return <AdminCampaignPanel />;
    case 'hero':
      return <AdminHeroPanel />;
    case 'yasal-metinler':
      return <AdminLegalDocumentsPanel />;
    case 'bakim-modu':
      return (
        <MaintenanceModeForm
          settings={settings}
          settingsLoading={settingsLoading}
          setField={setField}
          onSettingsSaved={onSettingsSaved}
        />
      );
    default:
      return null;
  }
}

function StoreInfoForm({ settings, settingsLoading, setField, onSettingsSaved }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const val = (k) => settings[k];
  const logoUrlVal = String(val('logoUrl') ?? '').trim();

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setMsg('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await apiFetch('/api/settings/logo', { method: 'POST', body: fd });
      const url = res?.data?.url || '';
      if (!url) throw new Error('Sunucu logo adresini döndürmedi.');
      setField('logoUrl', url);
      setMsg('Logo yüklendi ve kaydedildi. Mağazada görmek için sayfayı yenileyin.');
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Logo yüklenemedi.');
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    if (!logoUrlVal) return;
    setLogoBusy(true);
    setMsg('');
    setError('');
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: { settings: { logoUrl: '' } } });
      setField('logoUrl', '');
      setMsg('Logo kaldırıldı.');
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Logo kaldırılamadı.');
    } finally {
      setLogoBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    const payload = {};
    for (const k of STORE_KEYS) {
      if (STORE_BOOLEAN_KEYS.has(k)) {
        payload[k] = val(k) === true || val(k) === 'true';
      } else {
        payload[k] = val(k) ?? '';
      }
    }
    try {
      const res = await apiFetch('/api/settings', { method: 'PUT', body: { settings: payload } });
      onSettingsSaved(res?.data?.settings);
      setMsg('Kaydedildi.');
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-asta-navy">Mağaza bilgileri</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Mağaza adı, iletişim, yasal şirket bildirimi (iletişim sayfası), alt bilgi güven görselleri ve sosyal
          bağlantılar bu ekrandan yönetilir.
        </p>
      </div>

      {settingsLoading ? <p className="text-sm text-neutral-500">Ayarlar yükleniyor…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Mağaza adı
          </label>
          <input
            className={`mt-2 ${inputClass}`}
            value={String(val('storeName') ?? '')}
            onChange={(e) => setField('storeName', e.target.value)}
            disabled={settingsLoading}
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Slogan / açıklama
          </label>
          <input
            className={`mt-2 ${inputClass}`}
            value={String(val('storeTagline') ?? '')}
            onChange={(e) => setField('storeTagline', e.target.value)}
            disabled={settingsLoading}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            E-posta
          </label>
          <input
            type="email"
            className={`mt-2 ${inputClass}`}
            value={String(val('footerEmail') ?? '')}
            onChange={(e) => setField('footerEmail', e.target.value)}
            disabled={settingsLoading}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Telefon
          </label>
          <input
            className={`mt-2 ${inputClass}`}
            value={String(val('footerPhone') ?? '')}
            onChange={(e) => setField('footerPhone', e.target.value)}
            disabled={settingsLoading}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Adres (sipariş ve iletişim)
          </label>
          <textarea
            rows={3}
            className={`mt-2 ${inputClass}`}
            value={String(val('footerAddress') ?? '')}
            onChange={(e) => setField('footerAddress', e.target.value)}
            disabled={settingsLoading}
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-asta-navy">Mağaza logosu</h4>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Üst menüde mağaza adının (ASTA TİCARET) yanında görünür. PNG, JPG, WEBP veya SVG; en fazla 3 MB.
          Şeffaf arka planlı PNG/SVG önerilir.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex h-16 min-w-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4">
            {logoUrlVal ? (
              <img
                src={assetUrl(logoUrlVal)}
                alt="Mağaza logosu"
                className="max-h-12 w-auto object-contain"
              />
            ) : (
              <span className="text-xs text-neutral-400">Logo yok</span>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <label
              className={`inline-flex cursor-pointer items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover ${
                logoBusy || settingsLoading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {logoBusy ? 'Yükleniyor…' : logoUrlVal ? 'Logoyu değiştir' : 'Logo yükle'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={handleLogoFile}
                disabled={logoBusy || settingsLoading}
              />
            </label>
            {logoUrlVal ? (
              <button
                type="button"
                onClick={removeLogo}
                disabled={logoBusy || settingsLoading}
                className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:text-neutral-400"
              >
                Logoyu kaldır
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-asta-navy">İletişim sayfasında gösterilen yasal şirket bilgileri</h4>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Şeffaflık için ticari ünvan, vergi kimliği ve merkez adresi. Müşteri hattı olarak yukarıdaki e-posta ve telefon
          kullanılır.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Şirket / ticaret unvanı
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              placeholder="Örn: Asta Ticaret …"
              value={String(val('companyLegalName') ?? '')}
              onChange={(e) => setField('companyLegalName', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Vergi dairesi
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              value={String(val('companyTaxOffice') ?? '')}
              onChange={(e) => setField('companyTaxOffice', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Vergi numarası (VKN)
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              value={String(val('companyTaxNumber') ?? '')}
              onChange={(e) => setField('companyTaxNumber', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Yasal adres (merkez)
            </label>
            <textarea
              rows={3}
              className={`mt-2 ${inputClass}`}
              value={String(val('companyRegisteredAddress') ?? '')}
              onChange={(e) => setField('companyRegisteredAddress', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-asta-navy">Alt bilgi — ödeme, SSL ve kargo görselleri</h4>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Visa / Mastercard / Troy için adres boş bırakılırsa yerleşik görseller kullanılır. SSL ve kargo rozeti için
          tam adres veya yüklemiş olduğunuz göreli yol (
          <code className="rounded bg-neutral-200/70 px-1">/uploads/...</code>) girebilirsiniz.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={val('footerTrustShowPaymentCards') !== false && val('footerTrustShowPaymentCards') !== 'false'}
            onChange={(e) => setField('footerTrustShowPaymentCards', e.target.checked)}
            disabled={settingsLoading}
            className="h-4 w-4 rounded border-neutral-300 text-brand"
          />
          Visa, Mastercard ve Troy logolarını göster
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Visa görsel URL</label>
            <input
              type="url"
              className={`mt-2 ${inputClass}`}
              placeholder="/payments/visa.svg veya tam https adresi"
              value={String(val('footerTrustVisaUrl') ?? '')}
              onChange={(e) => setField('footerTrustVisaUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Mastercard görsel URL
            </label>
            <input
              type="url"
              className={`mt-2 ${inputClass}`}
              placeholder="/payments/mastercard.svg veya tam https adresi"
              value={String(val('footerTrustMastercardUrl') ?? '')}
              onChange={(e) => setField('footerTrustMastercardUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Troy görsel URL</label>
            <input
              type="url"
              className={`mt-2 ${inputClass}`}
              placeholder="/payments/troy.png veya tam https adresi"
              value={String(val('footerTrustTroyUrl') ?? '')}
              onChange={(e) => setField('footerTrustTroyUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Güvenli alışveriş / SSL rozeti görsel URL
            </label>
            <input
              type="url"
              className={`mt-2 ${inputClass}`}
              placeholder="Boş ise metin rozeti görünür (256‑bit SSL)"
              value={String(val('footerTrustSslUrl') ?? '')}
              onChange={(e) => setField('footerTrustSslUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Kargo ortağı logo URL
            </label>
            <input
              type="url"
              className={`mt-2 ${inputClass}`}
              placeholder="/uploads/kargo-logo.png …"
              value={String(val('footerTrustCarrierUrl') ?? '')}
              onChange={(e) => setField('footerTrustCarrierUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Kargo logosu alt metni
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              placeholder="Anlaşmalı kargo: Yurtiçi …"
              value={String(val('footerTrustCarrierLabel') ?? '')}
              onChange={(e) => setField('footerTrustCarrierLabel', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4">
        <h4 className="text-sm font-semibold text-asta-navy">Sosyal medya</h4>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">
          Boş bıraktığınız ağların simgesi sitede (üst çubuk ve alt bilgi) gösterilmez. Tam bağlantı veya{' '}
          <code className="rounded bg-neutral-200/80 px-1">instagram.com/kullaniciadiniz</code> gibi adres
          girebilirsiniz —{' '}
          <code className="rounded bg-neutral-200/80 px-1">https://</code> yazmanız gerekmiyor. WhatsApp için örnek:
          <code className="ml-1 rounded bg-neutral-200/80 px-1">wa.me/905551234567</code>
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Instagram
            </label>
            <input
              type="url"
              placeholder="https://instagram.com/…"
              className={`mt-2 ${inputClass}`}
              value={String(val('footerInstagramUrl') ?? '')}
              onChange={(e) => setField('footerInstagramUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              WhatsApp
            </label>
            <input
              type="url"
              placeholder="https://wa.me/90555…"
              className={`mt-2 ${inputClass}`}
              value={String(val('footerWhatsAppUrl') ?? '')}
              onChange={(e) => setField('footerWhatsAppUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Facebook</label>
            <input
              type="url"
              placeholder="https://facebook.com/…"
              className={`mt-2 ${inputClass}`}
              value={String(val('footerFacebookUrl') ?? '')}
              onChange={(e) => setField('footerFacebookUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
          <div className="sm:col-span-1">
            <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">X (Twitter)</label>
            <input
              type="url"
              placeholder="https://x.com/…"
              className={`mt-2 ${inputClass}`}
              value={String(val('footerTwitterUrl') ?? '')}
              onChange={(e) => setField('footerTwitterUrl', e.target.value)}
              disabled={settingsLoading}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || settingsLoading}
          className="rounded-xl bg-brand px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
        >
          {saving ? 'Kaydediliyor…' : 'Mağaza bilgilerini kaydet'}
        </button>
      </div>
    </form>
  );
}

function ShippingSettingsForm({ settings, settingsLoading, setField, onSettingsSaved }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const val = (k) => settings[k];

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    const payload = {};
    for (const k of SHIP_KEYS) {
      const raw = val(k);
      if (raw === undefined && k !== 'shippingFeeEnabled' && k !== 'freeShippingEnabled') continue;
      if (k === 'shippingFeeEnabled' || k === 'freeShippingEnabled') {
        payload[k] = raw === true || raw === 'true';
      } else {
        const n = typeof raw === 'number' ? raw : Number(raw);
        payload[k] = Number.isFinite(n) ? n : 0;
      }
    }
    try {
      const res = await apiFetch('/api/settings', { method: 'PUT', body: { settings: payload } });
      onSettingsSaved(res?.data?.settings);
      setMsg('Kaydedildi.');
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-asta-navy">Kargo</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Checkout ile aynı sunucu ayarları; yalnızca bu bölümdeki anahtarlar güncellenir.
        </p>
      </div>

      {settingsLoading ? <p className="text-sm text-neutral-500">Ayarlar yükleniyor…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={val('shippingFeeEnabled') !== false && val('shippingFeeEnabled') !== 'false'}
            onChange={(e) => setField('shippingFeeEnabled', e.target.checked)}
            disabled={settingsLoading}
            className="h-4 w-4 rounded border-neutral-300 text-brand"
          />
          Kargo ücreti aktif
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={val('freeShippingEnabled') !== false && val('freeShippingEnabled') !== 'false'}
            onChange={(e) => setField('freeShippingEnabled', e.target.checked)}
            disabled={settingsLoading}
            className="h-4 w-4 rounded border-neutral-300 text-brand"
          />
          Ücretsiz kargo eşiği aktif
        </label>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Standart kargo (₺)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className={`mt-2 ${inputClass}`}
            value={
              val('standardShippingFee') === undefined || val('standardShippingFee') === ''
                ? ''
                : Number(val('standardShippingFee'))
            }
            onChange={(e) =>
              setField('standardShippingFee', e.target.value === '' ? '' : Number(e.target.value))
            }
            disabled={settingsLoading}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
            Ücretsiz kargo eşiği (₺)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className={`mt-2 ${inputClass}`}
            value={
              val('freeShippingThreshold') === undefined || val('freeShippingThreshold') === ''
                ? ''
                : Number(val('freeShippingThreshold'))
            }
            onChange={(e) =>
              setField('freeShippingThreshold', e.target.value === '' ? '' : Number(e.target.value))
            }
            disabled={settingsLoading}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || settingsLoading}
          className="rounded-xl bg-brand px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
        >
          {saving ? 'Kaydediliyor…' : 'Kargo ayarlarını kaydet'}
        </button>
      </div>
    </form>
  );
}

function MaintenanceModeForm({ settings, settingsLoading, setField, onSettingsSaved }) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const val = (k) => settings[k];
  const modeOn = val('maintenanceMode') === true || val('maintenanceMode') === 'true';

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    const payload = {
      maintenanceMode: modeOn,
      maintenanceMessage: String(val('maintenanceMessage') ?? '').trim().slice(0, 2000),
    };
    try {
      const res = await apiFetch('/api/settings', { method: 'PUT', body: { settings: payload } });
      onSettingsSaved(res?.data?.settings);
      setMsg('Kaydedildi.');
    } catch (ex) {
      setError(typeof ex.message === 'string' ? ex.message : 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="mx-auto max-w-3xl space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <Wrench className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-asta-navy">Bakım modu</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Aktifken siteyi yalnızca yöneticiler görür; diğer kullanıcılar bakım sayfasına yönlendirilir.
          </p>
        </div>
      </div>

      {settingsLoading ? <p className="text-sm text-neutral-500">Ayarlar yükleniyor…</p> : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-asta-navy">
            {modeOn ? 'Site şu anda bakımda' : 'Site şu anda yayında'}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Bakım modunu açtığınızda diğer tüm kullanıcılar bakım sayfasına yönlendirilir.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={modeOn}
          disabled={settingsLoading}
          onClick={() => setField('maintenanceMode', !modeOn)}
          className={`relative ml-auto inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full transition-colors ${modeOn ? 'bg-brand' : 'bg-neutral-300'} disabled:opacity-50`}
        >
          <span
            className={`inline-block h-6 w-6 translate-x-1 rounded-full bg-white shadow transition-transform ${modeOn ? 'translate-x-6' : ''}`}
          />
        </button>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
          Ziyaretçiye gösterilecek mesaj
        </label>
        <textarea
          rows={5}
          className={`mt-2 ${inputClass}`}
          value={String(val('maintenanceMessage') ?? '')}
          onChange={(e) => setField('maintenanceMessage', e.target.value)}
          disabled={settingsLoading}
          maxLength={2000}
          placeholder="Sitemiz kısa süreliğine bakımda. Çok yakında geri döneceğiz."
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || settingsLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-brand-hover disabled:bg-neutral-400"
        >
          <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
          {saving ? 'Kaydediliyor…' : 'Bakım ayarlarını kaydet'}
        </button>
      </div>
    </form>
  );
}

function CategoryManagementPanel({ skinFilterRaw, onSettingsCommitted }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState('');
  /** @type {CategoryRow | null} */
  const [editor, setEditor] = useState(null);
  const [editorName, setEditorName] = useState('');
  /** @type {CategoryRow | null} */
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await apiFetch('/api/categories/all');
      const list = Array.isArray(res?.data?.categories) ? res.data.categories : [];
      setRows(list);
    } catch (e) {
      setErr(typeof e.message === 'string' ? e.message : 'Kategoriler yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [rows],
  );

  const addCategory = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setErr('');
    try {
      await apiFetch('/api/categories', { method: 'POST', body: { name } });
      setNewName('');
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kategori eklenemedi.');
    } finally {
      setCreating(false);
    }
  };

  const move = async (id, direction) => {
    setBusyId(`${id}:${direction}`);
    setErr('');
    try {
      await apiFetch(`/api/categories/${id}/move`, {
        method: 'PATCH',
        body: { direction },
      });
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Sıra güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const toggleActive = async (id, next) => {
    setBusyId(id);
    setErr('');
    try {
      await apiFetch(`/api/categories/${id}`, {
        method: 'PUT',
        body: { isActive: next },
      });
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Durum güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editor) return;
    const name = editorName.trim();
    if (!name) return;
    setBusyId(editor.id);
    setErr('');
    try {
      await apiFetch(`/api/categories/${editor.id}`, {
        method: 'PUT',
        body: { name },
      });
      setEditor(null);
      setEditorName('');
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kaydedilemedi.');
    } finally {
      setBusyId('');
    }
  };

  const doDelete = async (cat, force = false) => {
    setBusyId(cat.id);
    setErr('');
    try {
      const q = force ? '?force=1' : '';
      await apiFetch(`/api/categories/${cat.id}${q}`, { method: 'DELETE' });
      setConfirmDelete(null);
      await load();
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  const anyBusy = !!busyId;

  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-10 xl:grid-cols-2 xl:items-start">
        <section className="min-w-0 rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-asta-navy">Ürün kategorileri</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Site genelinde kullanılan kategoriler. Pasife alınanlar mağaza filtresinde gizlenir.
            </p>
          </div>
          <p className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold tabular-nums text-asta-navy">
            {rows.length} kategori
          </p>
        </div>

        <form
          onSubmit={addCategory}
          className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Yeni kategori
            </label>
            <input
              className={`mt-2 ${inputClass}`}
              placeholder="Yeni kategori adı (örn. yüz maskesi)"
              value={newName}
              onChange={(ev) => setNewName(ev.target.value)}
              maxLength={100}
              disabled={creating}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-muted px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-brand ring-1 ring-brand/25 hover:bg-brand/15 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            Kategori ekle
          </button>
        </form>

        {err ? (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {err}
          </div>
        ) : null}

        <div className="overflow-x-auto p-5">
          {loading ? (
            <p className="text-sm text-neutral-500">Yükleniyor…</p>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="pb-3 pr-4">Sıra</th>
                  <th className="pb-3 pr-4">Ad</th>
                  <th className="pb-3 pr-4">Slug</th>
                  <th className="pb-3 pr-4">Aktif</th>
                  <th className="pb-3">İşlem</th>
                </tr>
              </thead>
              <tbody className="text-neutral-800">
                {sorted.map((cat, idx) => (
                  <tr key={cat.id} className="border-b border-neutral-100 last:border-0">
                    <td className="align-middle py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={anyBusy || idx === 0}
                          onClick={() => move(cat.id, 'up')}
                          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-asta-navy disabled:opacity-40"
                          aria-label="Yukarı taşı"
                        >
                          <ArrowUp className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          disabled={anyBusy || idx === sorted.length - 1}
                          onClick={() => move(cat.id, 'down')}
                          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-asta-navy disabled:opacity-40"
                          aria-label="Aşağı taşı"
                        >
                          <ArrowDown className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <span className="ml-2 tabular-nums text-xs text-neutral-400">{idx + 1}</span>
                      </div>
                    </td>
                    <td className="max-w-[200px] py-3 pr-4 font-medium text-asta-navy">
                      <span className="line-clamp-2">{cat.name}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-neutral-500">{cat.slug}</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!cat.isActive}
                        disabled={busyId === cat.id}
                        onClick={() => toggleActive(cat.id, !cat.isActive)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${cat.isActive ? 'bg-brand' : 'bg-neutral-300'} disabled:opacity-60`}
                      >
                        <span
                          className={`inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform ${cat.isActive ? 'translate-x-6' : ''}`}
                        />
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditor(cat);
                            setEditorName(cat.name);
                          }}
                          disabled={anyBusy}
                          className="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:border-brand/30 hover:text-brand disabled:opacity-40"
                          aria-label="Düzenle"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(cat)}
                          disabled={anyBusy}
                          className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-40"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

        <div className="min-w-0">
          <SkinFilterCatalogPanel rawValue={skinFilterRaw} onCommitted={onSettingsCommitted} />
        </div>
      </div>

      {editor ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal
          aria-labelledby="cat-edit-title"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <h4 id="cat-edit-title" className="text-lg font-semibold text-asta-navy">
              Kategori düzenle
            </h4>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-500">Ad</label>
                <input
                  className={`mt-2 ${inputClass}`}
                  value={editorName}
                  onChange={(ev) => setEditorName(ev.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  onClick={() => {
                    setEditor(null);
                    setEditorName('');
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!editorName.trim() || busyId === editor.id}
                  className="rounded-xl bg-brand px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-brand-hover disabled:bg-neutral-400"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="alertdialog"
          aria-modal
          aria-labelledby="cat-del-title"
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <h4 id="cat-del-title" className="font-semibold text-asta-navy">
              Kategori silinsin mi?
            </h4>
            <p className="mt-2 text-sm text-neutral-600">
              <strong>{confirmDelete.name}</strong> kalıcı olarak silinir. Bu kategoriye atanmış ürünler varsa işlem
              reddedilir; ürün bağlarını sıfırlayıp silmek için ikinci seçeneği kullanın.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                onClick={() => setConfirmDelete(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                onClick={() => doDelete(confirmDelete, false)}
                disabled={busyId === confirmDelete.id}
              >
                Güvenli sil
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:bg-neutral-400"
                onClick={() => doDelete(confirmDelete, true)}
                disabled={busyId === confirmDelete.id}
              >
                Ürünleri ayır ve sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
