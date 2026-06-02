import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Save, Send, X, Power } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';

const TRIGGER_OPTIONS = [
  { value: 'days_after_signup_no_order', label: 'Kayıttan N gün sonra (hiç sipariş vermemişlere)' },
  { value: 'days_after_last_order', label: 'Son siparişten N gün sonra (geri kazanım)' },
];

const triggerLabel = (v) => TRIGGER_OPTIONS.find((o) => o.value === v)?.label ?? v;

const EMPTY = {
  name: '',
  enabled: false,
  triggerType: 'days_after_signup_no_order',
  triggerDays: 7,
  subject: '',
  bodyHtml: '',
  ctaText: 'Mağazayı Keşfet',
  ctaPath: '/urunler',
  repeatMode: 'once',
  repeatDays: 30,
  startAt: '',
  endAt: '',
};

/** ISO → datetime-local input değeri (yerel saat). */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToForm(row) {
  return {
    name: row.name ?? '',
    enabled: Boolean(row.enabled),
    triggerType: row.triggerType ?? 'days_after_signup_no_order',
    triggerDays: row.triggerDays ?? 7,
    subject: row.subject ?? '',
    bodyHtml: row.bodyHtml ?? '',
    ctaText: row.ctaText ?? '',
    ctaPath: row.ctaPath ?? '/urunler',
    repeatMode: row.repeatMode ?? 'once',
    repeatDays: row.repeatDays ?? 30,
    startAt: toLocalInput(row.startAt),
    endAt: toLocalInput(row.endAt),
  };
}

export default function AutomatedEmailsPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadErr('');
    return apiFetch('/api/email-automations')
      .then((res) => setRows(res?.data?.automations || []))
      .catch((e) => setLoadErr(e.message || 'Otomasyonlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setForm(EMPTY);
    setEditing('new');
    setError('');
    setMsg('');
  };

  const startEdit = (row) => {
    setForm(rowToForm(row));
    setEditing(row.id);
    setError('');
    setMsg('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildBody = () => ({
    name: form.name.trim(),
    enabled: form.enabled,
    triggerType: form.triggerType,
    triggerDays: Number(form.triggerDays),
    subject: form.subject.trim(),
    bodyHtml: form.bodyHtml,
    ctaText: form.ctaText.trim() || null,
    ctaPath: form.ctaPath.trim() || '/urunler',
    repeatMode: form.repeatMode,
    repeatDays: form.repeatMode === 'recurring' ? Number(form.repeatDays) : null,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
    endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
  });

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      const body = buildBody();
      if (editing === 'new') {
        await apiFetch('/api/email-automations', { method: 'POST', body });
        setMsg('Otomasyon oluşturuldu.');
      } else {
        await apiFetch(`/api/email-automations/${editing}`, { method: 'PUT', body });
        setMsg('Otomasyon güncellendi.');
      }
      setEditing(null);
      await load();
      window.setTimeout(() => setMsg(''), 5000);
    } catch (ex) {
      setError(ex.message || 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row) => {
    setBusyId(row.id);
    setError('');
    try {
      await apiFetch(`/api/email-automations/${row.id}`, {
        method: 'PUT',
        body: { enabled: !row.enabled },
      });
      await load();
    } catch (ex) {
      setError(ex.message || 'Durum değiştirilemedi.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`"${row.name}" otomasyonu silinsin mi?`)) return;
    setBusyId(row.id);
    setError('');
    try {
      await apiFetch(`/api/email-automations/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (ex) {
      setError(ex.message || 'Silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  const runNow = async (row) => {
    if (!window.confirm(`"${row.name}" şimdi çalıştırılsın mı? Uygun alıcılara mail gönderilecek.`)) return;
    setBusyId(row.id);
    setError('');
    setMsg('');
    try {
      const res = await apiFetch(`/api/email-automations/${row.id}/run-now`, { method: 'POST' });
      const r = res?.data?.result || {};
      setMsg(`Çalıştırıldı: ${r.sent ?? 0} gönderildi, ${r.skipped ?? 0} atlandı.`);
      await load();
      window.setTimeout(() => setMsg(''), 6000);
    } catch (ex) {
      setError(ex.message || 'Çalıştırılamadı.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-neutral-600">
          Tetikleyiciye bağlı otomatik e-postalar. Her kural, koşulu sağlayan müşterilere otomatik gönderilir.
          Motor günde bir tarama yapar; her kullanıcıya <strong>tek seferlik</strong> veya{' '}
          <strong>belirli gün aralığıyla tekrar</strong> gönderim seçilebilir.
        </p>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" /> Yeni otomasyon
        </button>
      </div>

      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{msg}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      ) : null}
      {loadErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          {loadErr}{' '}
          <button type="button" className="font-semibold underline" onClick={load}>
            Yeniden dene
          </button>
        </div>
      ) : null}

      {editing ? (
        <AutomationForm
          form={form}
          setField={setField}
          onSubmit={save}
          onCancel={cancelEdit}
          saving={saving}
          isNew={editing === 'new'}
        />
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          Henüz otomasyon yok. "Yeni otomasyon" ile oluşturabilirsiniz.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-asta-navy">{row.name}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {row.enabled ? 'Aktif' : 'Kapalı'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    <span className="font-medium">Konu:</span> {row.subject}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {triggerLabel(row.triggerType)} · {row.triggerDays} gün ·{' '}
                    {row.repeatMode === 'recurring'
                      ? `${row.repeatDays} günde bir tekrar`
                      : 'kişi başına 1 kez'}
                    {row.startAt || row.endAt
                      ? ` · ${row.startAt ? new Date(row.startAt).toLocaleDateString('tr-TR') : '…'}–${
                          row.endAt ? new Date(row.endAt).toLocaleDateString('tr-TR') : '…'
                        }`
                      : ''}
                  </p>
                  {row.lastRunAt ? (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Son tarama: {new Date(row.lastRunAt).toLocaleString('tr-TR')} ({row.lastSentCount} gönderildi)
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <IconBtn title={row.enabled ? 'Kapat' : 'Aktifleştir'} onClick={() => toggleEnabled(row)} disabled={busyId === row.id}>
                    <Power className={`h-4 w-4 ${row.enabled ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  </IconBtn>
                  <IconBtn title="Şimdi çalıştır" onClick={() => runNow(row)} disabled={busyId === row.id}>
                    <Send className="h-4 w-4 text-brand" />
                  </IconBtn>
                  <IconBtn title="Düzenle" onClick={() => startEdit(row)} disabled={busyId === row.id}>
                    <Pencil className="h-4 w-4 text-neutral-600" />
                  </IconBtn>
                  <IconBtn title="Sil" onClick={() => remove(row)} disabled={busyId === row.id}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({ title, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-neutral-200 bg-white p-2 hover:bg-neutral-50 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function AutomationForm({ form, setField, onSubmit, onCancel, saving, isNew }) {
  const labelCls = 'block text-xs font-semibold text-neutral-700';
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-brand/30 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-asta-navy">{isNew ? 'Yeni otomasyon' : 'Otomasyonu düzenle'}</h4>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Kapat">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Ad (yalnızca panelde görünür)</label>
          <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Hoş geldin teşviki" required />
        </div>

        <div>
          <label className={labelCls}>Tetikleyici</label>
          <select className={inputClass} value={form.triggerType} onChange={(e) => setField('triggerType', e.target.value)}>
            {TRIGGER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Kaç gün sonra?</label>
          <input type="number" min="0" max="3650" className={inputClass} value={form.triggerDays} onChange={(e) => setField('triggerDays', e.target.value)} required />
        </div>

        <div>
          <label className={labelCls}>Gönderim modu</label>
          <select className={inputClass} value={form.repeatMode} onChange={(e) => setField('repeatMode', e.target.value)}>
            <option value="once">Kişi başına 1 kez</option>
            <option value="recurring">Belirli gün aralığıyla tekrar</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Tekrar aralığı (gün){form.repeatMode !== 'recurring' ? ' — tekrar modunda' : ''}</label>
          <input type="number" min="1" max="3650" className={inputClass} value={form.repeatDays} onChange={(e) => setField('repeatDays', e.target.value)} disabled={form.repeatMode !== 'recurring'} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>E-posta konusu</label>
          <input className={inputClass} value={form.subject} onChange={(e) => setField('subject', e.target.value)} placeholder="Sana özel bir hediyemiz var" required />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>İçerik (HTML destekler)</label>
          <textarea
            className={`${inputClass} min-h-[140px] font-mono text-xs`}
            value={form.bodyHtml}
            onChange={(e) => setField('bodyHtml', e.target.value)}
            placeholder="<p>Merhaba, ...</p>"
            required
          />
          <p className="mt-1 text-xs text-neutral-400">Değişkenler: {'{{recipientName}}'}, {'{{storeName}}'} kullanılabilir.</p>
        </div>

        <div>
          <label className={labelCls}>Buton metni (opsiyonel)</label>
          <input className={inputClass} value={form.ctaText} onChange={(e) => setField('ctaText', e.target.value)} placeholder="Mağazayı Keşfet" />
        </div>
        <div>
          <label className={labelCls}>Buton bağlantısı (site içi yol)</label>
          <input className={inputClass} value={form.ctaPath} onChange={(e) => setField('ctaPath', e.target.value)} placeholder="/urunler" />
        </div>

        <div>
          <label className={labelCls}>Başlangıç tarihi (opsiyonel)</label>
          <input type="datetime-local" className={inputClass} value={form.startAt} onChange={(e) => setField('startAt', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Bitiş tarihi (opsiyonel)</label>
          <input type="datetime-local" className={inputClass} value={form.endAt} onChange={(e) => setField('endAt', e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={form.enabled} onChange={(e) => setField('enabled', e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand" />
        Bu otomasyonu aktifleştir (kaydedince otomatik gönderim başlar)
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-neutral-600 hover:text-neutral-800">
          Vazgeç
        </button>
      </div>
    </form>
  );
}
