import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { inputClass } from '../../lib/formStyles.js';
import {
  BILLABLE_ORDER_STATUSES,
  eInvoiceStatusBadgeClass,
  eInvoiceStatusLabel,
} from '../../lib/eInvoiceStatus.js';
import { orderStatusLabel } from './constants.js';

function orderNoDisplay(id) {
  return `#${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** @param {string | Date | undefined | null} v */
function formatTrDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    return '—';
  }
}

/** @param {Record<string, unknown>} o */
function formatBillingAddressLine(o) {
  if (o.billingSameAsShipping !== false) {
    const parts = [o.address, o.shippingDistrict, o.shippingProvince].filter(Boolean);
    return parts.length ? parts.join(', ') : String(o.address || '—');
  }
  const parts = [o.billingAddress, o.billingDistrict, o.billingProvince].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

export default function AdminBillingPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/orders')
      .then((res) => setOrders(Array.isArray(res?.data?.orders) ? res.data.orders : []))
      .catch((e) => setError(e.message || 'Siparişler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const billableOrders = useMemo(
    () => orders.filter((o) => BILLABLE_ORDER_STATUSES.has(String(o.status || ''))),
    [orders],
  );

  const stats = useMemo(() => {
    let awaiting = 0;
    let corporate = 0;
    let failed = 0;
    for (const o of billableOrders) {
      if (o.wantsElectronicInvoice) corporate += 1;
      const st = String(o.eInvoiceStatus || 'none');
      if (st === 'awaiting_integration' || st === 'pending_manual') awaiting += 1;
      if (st === 'failed') failed += 1;
    }
    return { awaiting, corporate, failed, billable: billableOrders.length };
  }, [billableOrders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...billableOrders];

    if (q) {
      list = list.filter((o) => {
        const hay = [
          o.id,
          o.fullName,
          o.email,
          o.invoiceCompanyTitle,
          o.invoiceTaxNumber,
          formatBillingAddressLine(o),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [billableOrders, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-asta-navy">
            <FileText className="h-7 w-7 text-brand" strokeWidth={1.75} aria-hidden />
            Faturalandırma
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Ödemesi alınmış siparişlerin fatura bilgileri ve e-fatura durumu. Paraşüt / muhasebe
            entegrasyonu bu ekrandan yönetilecek; şimdilik kayıtları görüntüleyip kuyruğu takip
            edebilirsiniz.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          Yenile
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Kuyruk</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-asta-navy">{stats.awaiting}</p>
          <p className="mt-1 text-xs text-neutral-500">Entegrasyon veya manuel işlem bekleyen</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Kurumsal</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-asta-navy">{stats.corporate}</p>
          <p className="mt-1 text-xs text-neutral-500">VKN/TCKN ile fatura talebi</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Hata</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-red-700">{stats.failed}</p>
          <p className="mt-1 text-xs text-neutral-500">Son entegrasyon hatası olan</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Faturalanabilir</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-asta-navy">{stats.billable}</p>
          <p className="mt-1 text-xs text-neutral-500">İptal / ödeme bekleyen hariç</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-md sm:ml-auto">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sipariş, müşteri, VKN…"
              className={`${inputClass} py-2 pl-9 text-sm`}
              autoComplete="off"
            />
          </div>
        </div>

        {error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">Yükleniyor…</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            Kayıt bulunamadı.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3">Sipariş</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Müşteri</th>
                  <th className="px-4 py-3">Fatura / adres</th>
                  <th className="px-4 py-3">E-fatura durumu</th>
                  <th className="px-4 py-3">Sipariş durumu</th>
                  <th className="px-4 py-3 text-right">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visible.map((o) => {
                  const corp = Boolean(o.wantsElectronicInvoice);
                  const tax = String(o.invoiceTaxNumber || '').replace(/\D/g, '');
                  return (
                    <tr key={o.id} className="hover:bg-neutral-50/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-asta-navy">
                        <Link
                          to="/admin/siparisler"
                          className="text-brand hover:underline"
                          title="Sipariş yönetiminde aç"
                        >
                          {orderNoDisplay(o.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {formatTrDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{o.fullName || '—'}</p>
                        <p className="text-xs text-neutral-500">{o.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        {corp ? (
                          <div>
                            <p className="font-medium text-neutral-900">
                              {o.invoiceCompanyTitle || '—'}
                            </p>
                            <p className="text-xs tabular-nums text-neutral-500">
                              {tax || '—'}
                              {o.invoiceTaxOffice ? ` · ${o.invoiceTaxOffice}` : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-600">Perakende (ad-soyad)</span>
                        )}
                        <p className="mt-1 max-w-[16rem] text-xs leading-snug text-neutral-500">
                          {formatBillingAddressLine(o)}
                          {o.billingSameAsShipping === false ? (
                            <span className="ml-1 font-semibold text-amber-800">· Ayrı fatura adresi</span>
                          ) : null}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${eInvoiceStatusBadgeClass(o.eInvoiceStatus)}`}
                        >
                          {eInvoiceStatusLabel(o.eInvoiceStatus)}
                        </span>
                        {o.eInvoiceLastError ? (
                          <p className="mt-1 max-w-[14rem] truncate text-xs text-red-600" title={String(o.eInvoiceLastError)}>
                            {String(o.eInvoiceLastError)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{orderStatusLabel(o.status)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-asta-navy">
                        {formatTRY(Number(o.totalAmount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        Sipariş detayı ve kargo için{' '}
        <Link to="/admin/siparisler" className="font-semibold text-brand hover:underline">
          Siparişler
        </Link>{' '}
        sayfasını kullanın. CSV dışa aktarımında fatura kolonları mevcuttur.
      </p>
    </div>
  );
}
