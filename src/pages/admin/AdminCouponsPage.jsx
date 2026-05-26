import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { inputClass } from '../../lib/formStyles.js';

function toIsoFromLocal(val) {
  if (!val) return '';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/coupons')
      .then((res) => setCoupons(Array.isArray(res?.data?.coupons) ? res.data.coupons : []))
      .catch((e) => setError(e.message || 'Liste alınamadı.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    const pct = Number(discountPercent);
    if (!code.trim()) {
      setFormError('Kupon kodunu girin.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/coupons', {
        method: 'POST',
        body: {
          code: code.trim(),
          discountPercent: pct,
          minOrderAmount: minOrderAmount === '' ? 0 : Number(minOrderAmount),
          startsAt: startsAt ? toIsoFromLocal(startsAt) : null,
          expiresAt: expiresAt ? toIsoFromLocal(expiresAt) : null,
        },
      });
      setCode('');
      setExpiresAt('');
      await load();
    } catch (err) {
      setFormError(err.message || 'Kupon oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Kupon kalıcı olarak silinsin mi?')) return;
    setBusy(true);
    try {
      await apiFetch(`/api/coupons/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e.message || 'Silinemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-asta-navy">Kuponlar</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Yüzde indirim kuponları; müşteri sepetinde `/api/coupons/validate` ile doğrulanır.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <h3 className="font-bold text-asta-navy">Yeni kupon</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase text-neutral-600">Kod</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ORN: YAZ2026"
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-600">İndirim %</label>
            <input
              type="number"
              min={1}
              max={99}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-600">Min. sepet (₺)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-600">Başlangıç</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-neutral-600">Bitiş</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </div>
        </div>
        {formError && <p className="mt-3 text-sm font-medium text-red-600">{formError}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:bg-neutral-400"
        >
          {busy ? 'Kaydediliyor…' : 'Kupon ekle'}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full divide-y divide-neutral-200 text-left text-sm">
          <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
            <tr>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Min. sepet</th>
              <th className="px-4 py-3">Tarihler</th>
              <th className="px-4 py-3">Aktif</th>
              <th className="px-4 py-3 w-[80px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Yükleniyor…
                </td>
              </tr>
            )}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Kayıtlı kupon yok.
                </td>
              </tr>
            )}
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-bold text-brand">{c.code}</td>
                <td className="px-4 py-3 tabular-nums">{c.discountPercent}</td>
                <td className="px-4 py-3 tabular-nums">{Number(c.minOrderAmount || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-xs text-neutral-600">
                  {c.startsAt ? new Date(c.startsAt).toLocaleString('tr-TR') : '—'}{' '}
                  → {c.expiresAt ? new Date(c.expiresAt).toLocaleString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3">{c.isActive ? 'Evet' : 'Hayır'}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(c.id)}
                    className={`text-xs font-semibold text-red-700 underline ${busy ? '' : ''}`}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
