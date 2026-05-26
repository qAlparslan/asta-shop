import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Loader2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    ['link'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const quillFormats = ['bold', 'italic', 'underline', 'link', 'list', 'bullet'];

/** @param {string} html */
function isEmptyHtml(html) {
  const t = String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, '')
    .trim();
  return !t;
}

const AUDIENCES = [
  { value: 'all_consenting', labelKey: 'all_consenting' },
  { value: 'newsletter', labelKey: 'newsletter' },
  { value: 'both', labelKey: 'both' },
  { value: 'all_users', labelKey: 'all_users' },
];

const STATUS_TR = {
  draft: 'Taslak',
  scheduled: 'Zamanlı',
  sending: 'Gönderiliyor…',
  sent: 'Tamamlandı',
  failed: 'Hata',
  cancelled: 'İptal',
};

export default function AdminCampaignPanel() {
  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [couponErr, setCouponErr] = useState('');

  const [mode, setMode] = useState(
    /** @type {'now' | 'schedule' | 'draft'} */ ('now')
  );
  const [audience, setAudience] = useState('all_consenting');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [couponId, setCouponId] = useState('');
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [variantBTitle, setVariantBTitle] = useState('');
  const [variantBBodyHtml, setVariantBBodyHtml] = useState('');
  const [abSplitPercent, setAbSplitPercent] = useState(50);
  const [scheduledLocal, setScheduledLocal] = useState('');

  const [testTo, setTestTo] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);

  const [banner, setBanner] = useState(
    /** @type {{ kind: 'ok'|'err'; text: string } | null} */ (null)
  );

  const loadStats = useCallback(() => {
    setStatsErr('');
    return apiFetch('/api/campaigns/audience-stats')
      .then((r) => setStats(r?.data ?? null))
      .catch((e) => setStatsErr(e.message || 'İstatistik alınamadı.'));
  }, []);

  const loadCampaigns = useCallback(() => {
    setCampaignsLoading(true);
    return apiFetch('/api/campaigns?limit=50')
      .then((r) => setCampaigns(r?.data?.campaigns ?? []))
      .catch(() => setCampaigns([]))
      .finally(() => setCampaignsLoading(false));
  }, []);

  const loadCoupons = useCallback(() => {
    setCouponErr('');
    return apiFetch('/api/coupons')
      .then((r) => setCoupons(r?.data?.coupons ?? []))
      .catch((e) => setCouponErr(e.message || 'Kuponlar yüklenemedi.'));
  }, []);

  useEffect(() => {
    loadStats();
    loadCampaigns();
    loadCoupons();
  }, [loadStats, loadCampaigns, loadCoupons]);

  const audienceOptions = useMemo(() => {
    const s = stats || {};
    return AUDIENCES.map((a) => {
      let count = '';
      if (typeof s[a.labelKey] === 'number') {
        count = ` (${s[a.labelKey]})`;
      }
      const label =
        {
          all_consenting: 'Pazarlama izinli üyeler',
          newsletter: 'Aktif bülten aboneleri',
          both: 'Birleşik (üye + bülten, tekil)',
          all_users: 'Tüm kayıtlı kullanıcılar',
        }[a.value] || a.value;

      return { ...a, display: `${label}${count}` };
    });
  }, [stats]);

  const handleRefreshAll = () => {
    loadStats();
    loadCampaigns();
    loadCoupons();
  };

  const sendTestMail = async (e) => {
    e.preventDefault();
    setBanner(null);
    if (!testTo.trim()) {
      setBanner({ kind: 'err', text: 'Test için e-posta girin.' });
      return;
    }
    if (!title.trim() || isEmptyHtml(bodyHtml)) {
      setBanner({ kind: 'err', text: 'Test için başlık ve içerik (A varyantı) doldurulmalı.' });
      return;
    }
    setTestBusy(true);
    try {
      const body = {
        to: testTo.trim(),
        title: title.trim(),
        bodyHtml,
        ctaText: ctaText.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
        couponId: couponId || undefined,
      };
      const out = await apiFetch('/api/campaigns/test', { method: 'POST', body });
      const ok = out.status === 'success';
      setBanner({
        kind: ok ? 'ok' : 'err',
        text: typeof out.message === 'string' ? out.message : ok ? 'Gönderildi.' : 'Gönderilemedi.',
      });
    } catch (err) {
      setBanner({ kind: 'err', text: err.message || 'Test maili gönderilemedi.' });
    } finally {
      setTestBusy(false);
    }
  };

  const submitCampaign = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (!title.trim()) {
      setBanner({ kind: 'err', text: 'Başlık zorunlu.' });
      return;
    }
    if (isEmptyHtml(bodyHtml)) {
      setBanner({ kind: 'err', text: 'E-posta içeriği boş olamaz.' });
      return;
    }

    let scheduledAt;
    if (mode === 'schedule') {
      if (!scheduledLocal) {
        setBanner({ kind: 'err', text: 'Zamanlama için tarih/saat seçin.' });
        return;
      }
      const d = new Date(scheduledLocal);
      if (Number.isNaN(d.getTime())) {
        setBanner({ kind: 'err', text: 'Geçersiz tarih/saat.' });
        return;
      }
      scheduledAt = d.toISOString();
    }

    if (abTestEnabled) {
      if (!variantBTitle.trim() || isEmptyHtml(variantBBodyHtml)) {
        setBanner({
          kind: 'err',
          text: 'A/B test için B varyantının başlık ve içeriği zorunlu.',
        });
        return;
      }
    }

    setSubmitBusy(true);
    try {
      const payload = {
        mode,
        title: title.trim(),
        bodyHtml,
        audience,
        ctaText: ctaText.trim() || null,
        ctaUrl: ctaUrl.trim() || null,
        couponId: couponId ? Number(couponId) : null,
        scheduledAt,
        abTestEnabled,
        variantBTitle: abTestEnabled ? variantBTitle.trim() : undefined,
        variantBBodyHtml: abTestEnabled ? variantBBodyHtml : undefined,
        abSplitPercent: abTestEnabled ? abSplitPercent : undefined,
      };

      const res = await apiFetch('/api/campaigns', {
        method: 'POST',
        body: payload,
      });

      const msg =
        res.message ||
        (res.status === 'accepted'
          ? 'Kampanya gönderimi başlatıldı; geçmişi yenileyerek durumu izleyebilirsiniz.'
          : 'Kayıt oluşturuldu.');

      setBanner({
        kind: 'ok',
        text: typeof msg === 'string' ? msg : 'Tamam.',
      });

      await loadCampaigns();
      await loadStats();
    } catch (err) {
      setBanner({
        kind: 'err',
        text: err.message || 'Kayıt başarısız.',
      });
    } finally {
      setSubmitBusy(false);
    }
  };

  const actionSendNow = async (id) => {
    if (!window.confirm('Bu kampanyayı şimdi göndermek istiyor musunuz?')) return;
    try {
      const res = await apiFetch(`/api/campaigns/${id}/send-now`, {
        method: 'POST',
        body: {},
      });
      setBanner({
        kind: 'ok',
        text:
          res.message ||
          'Gönderim başladı.',
      });
      await loadCampaigns();
    } catch (e) {
      setBanner({ kind: 'err', text: e.message || 'Başarısız.' });
    }
  };

  const actionCancel = async (id) => {
    if (!window.confirm('Kampanya iptal edilsin mi?')) return;
    try {
      const res = await apiFetch(`/api/campaigns/${id}/cancel`, {
        method: 'POST',
        body: {},
      });
      setBanner({
        kind: 'ok',
        text: res.message || 'İptal edildi.',
      });
      await loadCampaigns();
    } catch (e) {
      setBanner({ kind: 'err', text: e.message || 'Başarısız.' });
    }
  };

  const minSchedule = useMemo(() => {
    const t = Date.now() + 120000;
    const d = new Date(t);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  return (
    <div className="space-y-8">
      {statsErr ? (
        <p className="text-sm text-amber-700">
          {statsErr}{' '}
          <button type="button" className="font-semibold underline" onClick={loadStats}>
            Yeniden dene
          </button>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pazarlama izni uygun üyeler"
          value={stats?.all_consenting ?? '—'}
          note="kampanya/eposta uygun (usersWantCampaignOffers)"
        />
        <StatCard
          title="Aktif bülten aboneleri"
          value={stats?.newsletter ?? '—'}
          note="newsletter aktif"
        />
        <StatCard
          title="Birleşik"
          value={stats?.both ?? '—'}
          note="üye + bülten e-posta (tekil küme)"
        />
        <StatCard
          title="Tüm kayıtlı kullanıcılar"
          value={stats?.all_users ?? '—'}
          note="dikkat: izin filtresi yok"
          emphasize
        />
      </div>

      {banner ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            banner.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="text-lg font-bold text-asta-navy">Kampanya oluştur</h3>

        <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-neutral-100 p-1">
          {[
            { id: 'now', label: 'Şimdi gönder' },
            { id: 'schedule', label: 'Zamanla' },
            { id: 'draft', label: 'Taslak' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(/** @type {any} */ (t.id))}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === t.id
                  ? 'bg-white text-asta-navy shadow-sm'
                  : 'text-neutral-600 hover:text-asta-navy'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form className="mt-6 space-y-5" onSubmit={submitCampaign}>
          <div>
            <label className="block text-sm font-semibold text-asta-navy">Kitle</label>
            <select
              className={`${inputClass} mt-1 max-w-md`}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              {audienceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.display}
                </option>
              ))}
            </select>
            {audience === 'all_users' ? (
              <p className="mt-1 text-xs text-amber-800">
                Bu seçenek tüm hesapları hedefler; pazarlama izni filtrelenmez.
              </p>
            ) : null}
          </div>

          {mode === 'schedule' ? (
            <div>
              <label className="block text-sm font-semibold text-asta-navy">
                Planlanan tarih / saat
              </label>
              <input
                type="datetime-local"
                className={`${inputClass} mt-1 max-w-md`}
                min={minSchedule}
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
              />
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-semibold text-asta-navy">Başlık (konu)</label>
            <input
              type="text"
              className={`${inputClass} mt-1`}
              placeholder="Örn: Sonbahar indirimleri başladı!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-asta-navy">İçerik (HTML)</label>
            <div className="mt-1 rounded-xl border border-neutral-200 bg-white [&_.ql-container]:min-h-[180px]">
              <ReactQuill
                theme="snow"
                value={bodyHtml}
                onChange={setBodyHtml}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Maille birlikte gönderilecek mesaj…"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-asta-navy">
                Buton yazısı (opsiyonel)
              </label>
              <input
                type="text"
                className={`${inputClass} mt-1`}
                placeholder="Alışverişe git"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-asta-navy">
                Buton URL (opsiyonel)
              </label>
              <input
                type="url"
                className={`${inputClass} mt-1`}
                placeholder="https://…"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-asta-navy">
              İlişkili kupon (opsiyonel)
            </label>
            <select
              className={`${inputClass} mt-1 max-w-md`}
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
            >
              <option value="">— Kupon yok —</option>
              {coupons.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.code} (%{c.discountPercent})
                </option>
              ))}
            </select>
            {couponErr ? <p className="mt-1 text-xs text-amber-700">{couponErr}</p> : null}
            <p className="mt-1 text-xs text-neutral-500">
              Seçilen kupon, mailde özel blokta gösterilir.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-brand"
                checked={abTestEnabled}
                onChange={(e) => setAbTestEnabled(e.target.checked)}
              />
              <span className="text-sm font-semibold text-asta-navy">A/B test</span>
            </label>
            <p className="mt-1 pl-7 text-xs text-neutral-600">
              Kitleyi iki gruba bölerek farklı başlık ve içerik dener; oran A grubu için % olarak
              ayarlanır.
            </p>

            {abTestEnabled ? (
              <div className="mt-4 space-y-4 border-t border-neutral-200 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600">
                    A grubu oranı (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={95}
                    className={`${inputClass} mt-1 w-32`}
                    value={abSplitPercent}
                    onChange={(e) =>
                      setAbSplitPercent(
                        Math.min(95, Math.max(5, parseInt(e.target.value, 10) || 50))
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-asta-navy">
                    B varyantı — başlık
                  </label>
                  <input
                    type="text"
                    className={`${inputClass} mt-1`}
                    value={variantBTitle}
                    onChange={(e) => setVariantBTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-asta-navy">
                    B varyantı — içerik
                  </label>
                  <div className="mt-1 rounded-xl border border-neutral-200 bg-white [&_.ql-container]:min-h-[140px]">
                    <ReactQuill
                      theme="snow"
                      value={variantBBodyHtml}
                      onChange={setVariantBBodyHtml}
                      modules={quillModules}
                      formats={quillFormats}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-semibold text-asta-navy">Test maili gönder</label>
              <p className="text-xs text-neutral-500">
                Sadece A varyantını kullanır; alıcı e-postasında kayıtlıysa kişisel alanlar
                dolabilir.
              </p>
              <input
                type="email"
                className={`${inputClass} mt-2`}
                placeholder="test@email.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={sendTestMail}
              disabled={testBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-asta-navy px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-asta-navy/90 disabled:opacity-60"
            >
              {testBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Test gönder
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitBusy}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'now'
                ? 'Hemen gönder'
                : mode === 'schedule'
                  ? 'Zamanla ve kaydet'
                  : 'Taslak olarak kaydet'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-asta-navy">Kampanya geçmişi</h3>
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-asta-navy hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
        </div>

        {campaignsLoading ? (
          <p className="mt-4 text-sm text-neutral-500">Yükleniyor…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Henüz kampanya yok.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-600">
                  <th className="py-2 pr-3 font-semibold">Konu</th>
                  <th className="py-2 pr-3 font-semibold">Durum</th>
                  <th className="py-2 pr-3 font-semibold">Kitle</th>
                  <th className="py-2 pr-3 font-semibold">Özet</th>
                  <th className="py-2 font-semibold">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const canSendNow = ['scheduled', 'draft', 'failed'].includes(c.status);
                  const canCancel = ['scheduled', 'draft'].includes(c.status);
                  return (
                  <tr key={c.id} className="border-b border-neutral-100">
                    <td className="py-3 pr-3 font-medium text-asta-navy">{c.title}</td>
                    <td className="py-3 pr-3">{STATUS_TR[c.status] || c.status}</td>
                    <td className="py-3 pr-3 text-neutral-700">{c.audience}</td>
                    <td className="py-3 pr-3 text-xs text-neutral-600">
                      Alıcı: {c.totalRecipients ?? '—'} · Gönderilen: {c.sentCount ?? '—'} · Hata:{' '}
                      {c.failedCount ?? '—'}
                      {c.abTestEnabled ? (
                        <span className="ml-1 block text-neutral-500">
                          A/B: A {c.variantASent ?? 0}/{c.variantAFailed ?? 0}, B{' '}
                          {c.variantBSent ?? 0}/{c.variantBFailed ?? 0}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3">
                      {canSendNow ? (
                        <button
                          type="button"
                          onClick={() => actionSendNow(c.id)}
                          className="mr-2 font-semibold text-brand hover:underline"
                        >
                          Şimdi gönder
                        </button>
                      ) : null}
                      {canCancel ? (
                        <button
                          type="button"
                          onClick={() => actionCancel(c.id)}
                          className="font-semibold text-neutral-600 hover:underline"
                        >
                          İptal
                        </button>
                      ) : null}
                      {!canSendNow && !canCancel ? (
                        <span className="text-xs text-neutral-400">—</span>
                      ) : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value, note, emphasize }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        emphasize ? 'border-amber-200 bg-amber-50/50' : 'border-neutral-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-asta-navy">{value}</p>
      {note ? <p className="mt-1 text-xs text-neutral-500">{note}</p> : null}
    </div>
  );
}
