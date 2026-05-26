import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';
import {
  defaultSkinCatalogRows,
  normalizeSkinCatalogRows,
  serializeSkinCatalogRows,
} from '../../lib/skinFilterCatalog.js';

const BASELINE_ROWS = defaultSkinCatalogRows();

/**
 * Ürün kategorilerinin yanında — vitrin «Cilt tipi» filtresi etiketleri.
 * Kayıtlar `SiteSetting.skinFilterOptions` olarak saklanır.
 *
 * @param {{ rawValue: unknown; onCommitted: (nextSettings: Record<string, unknown>) => void }} props
 */
export default function SkinFilterCatalogPanel({ rawValue, onCommitted }) {
  const [rows, setRows] = useState(() => defaultSkinCatalogRows());
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setRows(normalizeSkinCatalogRows(rawValue));
  }, [rawValue]);

  const persist = async () => {
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const json = serializeSkinCatalogRows(rows);
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        body: { settings: { skinFilterOptions: json } },
      });
      onCommitted?.(res?.data?.settings ?? {});
      setMsg('Cilt filtresi kaydedildi.');
    } catch (ex) {
      setErr(typeof ex.message === 'string' ? ex.message : 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const updateRow = useCallback((slug, patch) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.slug !== slug) return r;
        const next = { ...r, ...patch };
        if (typeof next.label === 'string')
          next.label =
            next.label.trim().slice(0, 80) ||
            BASELINE_ROWS.find((b) => b.slug === slug)?.label ||
            r.label;
        return next;
      }),
    );
  }, []);

  const moveRow = useCallback((idx, delta) => {
    setRows((ordered) => {
      const rs = [...ordered];
      const j = idx + delta;
      if (j < 0 || j >= rs.length) return rs;
      const t = rs[idx];
      rs[idx] = rs[j];
      rs[j] = t;
      return rs;
    });
  }, []);

  return (
    <section className="w-full rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
        <div>
          <h3 className="text-lg font-semibold text-asta-navy">Cilt tipi (mağaza filtresi)</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Vitrindeki çoklu seçim filtresidir. Gösterilen isimleri ve sırayı düzenlersiniz; üründeki teknik kod
            değişmez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => persist()}
          disabled={saving}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-asta-navy px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:opacity-95 disabled:bg-neutral-400"
        >
          <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      {err ? (
        <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{err}</div>
      ) : null}
      {msg ? (
        <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}

      <div className="overflow-x-auto p-5">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <th className="pb-3 pr-3">Sıra</th>
              <th className="pb-3 pr-3">Kod</th>
              <th className="pb-3 pr-3">Liste adı</th>
              <th className="pb-3 pr-4">Filtrede göster</th>
              <th className="pb-3">Şablon ad</th>
            </tr>
          </thead>
          <tbody className="text-neutral-800">
            {rows.map((row, idx) => (
              <tr key={row.slug} className="border-b border-neutral-100 last:border-0">
                <td className="align-middle py-3 pr-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveRow(idx, -1)}
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                      aria-label="Yukarı"
                    >
                      <ArrowUp className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === rows.length - 1}
                      onClick={() => moveRow(idx, +1)}
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                      aria-label="Aşağı"
                    >
                      <ArrowDown className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </td>
                <td className="py-3 pr-3 font-mono text-xs text-neutral-500">{row.slug}</td>
                <td className="py-3 pr-3">
                  <input
                    className={`w-full max-w-[14rem] ${inputClass}`}
                    value={row.label}
                    onChange={(ev) => updateRow(row.slug, { label: ev.target.value })}
                    maxLength={80}
                  />
                </td>
                <td className="py-3 pr-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.enabled}
                    onClick={() => updateRow(row.slug, { enabled: !row.enabled })}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${row.enabled ? 'bg-brand' : 'bg-neutral-300'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform ${row.enabled ? 'translate-x-6' : ''}`}
                    />
                  </button>
                </td>
                <td className="py-3 text-xs text-neutral-400">{BASELINE_ROWS.find((s) => s.slug === row.slug)?.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-neutral-500">
          Pasif satır vitrin filtresinden gizlenir. Ürün kayıtları kod üzerinden aynı kalır.
        </p>
      </div>
    </section>
  );
}
