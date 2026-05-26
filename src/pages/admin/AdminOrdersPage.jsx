import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  MapPin,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { inputClass } from '../../lib/formStyles.js';
import { ORDER_STATUSES, orderStatusLabel } from './constants.js';

/** @param {string | Date | undefined | null} v */
function formatTrDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}.${mo}.${y}`;
}

/** @param {string} status */
function statusTone(status) {
  switch (status) {
    case 'hazirlaniyor':
      return 'bg-sky-100 text-sky-800 ring-1 ring-sky-200/80';
    case 'kargolandi':
      return 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/80';
    case 'teslim-edildi':
      return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80';
    case 'iptal-edildi':
      return 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/80';
    case 'odeme_bekleniyor':
      return 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/80';
    default:
      return 'bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200';
  }
}

function orderNoDisplay(id) {
  return `#${String(id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** @param {unknown} raw */
function parseOrderItems(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @type {{ value: string; label: string; icon: import('lucide-react').LucideIcon }[]} */
const QUICK_STATUS_OPTIONS = [
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', icon: Clock },
  { value: 'teslim-edildi', label: 'Teslim edildi', icon: CheckCircle2 },
  { value: 'iptal-edildi', label: 'İptal et', icon: XCircle },
];

/** @param {{ wantsElectronicInvoice?: boolean; eInvoiceStatus?: string | null; eInvoiceIntegrationRef?: string | null }} o */
function electronicInvoiceCellLabel(o) {
    const ref = String(o?.eInvoiceIntegrationRef || '');
    if (ref.startsWith('ps:')) {
        if (String(o?.eInvoiceLastError || '').trim()) return 'Paraşüt hata';
        return 'Paraşüt kayıtlı';
    }
    if (!o?.wantsElectronicInvoice) return '—';
    const st = String(o.eInvoiceStatus || '');
    switch (st) {
        case 'awaiting_integration':
            return 'İşleniyor';
        case 'submitted':
            return 'Entegratörde';
        case 'pending_manual':
            return 'Manuel';
        case 'failed':
            return 'Hata';
        case 'none':
        default:
            return 'Talep';
    }
}

/** @param {{ wantsElectronicInvoice?: boolean; eInvoiceStatus?: string | null; eInvoiceIntegrationRef?: string | null; eInvoiceLastError?: string | null }} o */
function electronicInvoiceTone(o) {
    const ref = String(o?.eInvoiceIntegrationRef || '');
    if (ref.startsWith('ps:')) {
        if (String(o?.eInvoiceLastError || '').trim()) return 'text-rose-700 font-semibold';
        return 'text-emerald-700 font-semibold';
    }
    if (!o?.wantsElectronicInvoice) return 'text-neutral-400 font-medium';
    switch (String(o.eInvoiceStatus || '')) {
        case 'submitted':
            return 'text-emerald-700 font-semibold';
        case 'failed':
            return 'text-rose-700 font-semibold';
        case 'pending_manual':
            return 'text-amber-800 font-semibold';
        case 'awaiting_integration':
            return 'text-sky-700 font-semibold';
        default:
            return 'text-neutral-700 font-semibold';
    }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  /** yyyy-mm-dd for <input type="date" /> */
  const [dateFilter, setDateFilter] = useState('');

  /** @type {null | Record<string, unknown>} */
  const [detailOrder, setDetailOrder] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalTracking, setModalTracking] = useState('');
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/orders')
      .then((res) => setOrders(Array.isArray(res?.data?.orders) ? res.data.orders : []))
      .catch((e) => setError(e.message || 'Liste alınamadı.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...orders];

    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (dateFilter) {
      const [y, m, d] = dateFilter.split('-').map(Number);
      if (y && m && d) {
        list = list.filter((o) => {
          const dt = new Date(o.createdAt);
          return (
            dt.getFullYear() === y &&
            dt.getMonth() + 1 === m &&
            dt.getDate() === d
          );
        });
      }
    }

    if (q) {
      list = list.filter((o) => {
        const idFold = String(o.id).replace(/-/g, '').toLowerCase();
        const shortId = orderNoDisplay(o.id).slice(1).toLowerCase();
        return (
          idFold.includes(q.replace(/^#/, '')) ||
          shortId.includes(q.replace(/^#/, '')) ||
          String(o.fullName || '')
            .toLowerCase()
            .includes(q) ||
          String(o.email || '')
            .toLowerCase()
            .includes(q) ||
          String(o.phone || '')
            .toLowerCase()
            .includes(q.replace(/\s/g, ''))
        );
      });
    }

    return list;
  }, [orders, query, statusFilter, dateFilter]);

  const csvExport = async () => {
    setExporting(true);
    try {
      await downloadAuthorizedFile('/api/orders/export/csv');
    } catch (e) {
      setError(e.message || 'Dışa aktarma başarısız.');
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (o) => {
    setDetailOrder(o);
    setModalStatus(o.status);
    setModalTracking(o.trackingNumber || '');
    setError('');
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setModalTracking('');
    setModalStatus('');
  };

  const shipOrder = async () => {
    if (!detailOrder) return;
    const no = (modalTracking || '').trim();
    if (!no) {
      setError('Kargoya vermek için DHL takip numarası zorunludur.');
      return;
    }
    setShipping(true);
    setError('');
    try {
      await apiFetch(`/api/orders/${detailOrder.id}/ship`, {
        method: 'POST',
        body: { trackingNumber: no },
      });
      await load();
      closeDetail();
    } catch (e) {
      setError(e.message || 'Kargoya verilemedi.');
    } finally {
      setShipping(false);
    }
  };

  const saveDetail = async () => {
    if (!detailOrder) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/api/orders/${detailOrder.id}`, {
        method: 'PUT',
        body: {
          status: modalStatus,
          trackingNumber: modalTracking.trim() || null,
        },
      });
      await load();
      closeDetail();
    } catch (e) {
      setError(e.message || 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const modalItems = detailOrder ? parseOrderItems(detailOrder.items) : [];
  const unchanged =
    detailOrder &&
    modalStatus === detailOrder.status &&
    (modalTracking || '').trim() === String(detailOrder.trackingNumber || '').trim();

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">
          Sipariş yönetimi
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Arama ve filtrelerle siparişleri bulun; detayda durum ve kargo kodunu güncelleyin. Kayıtta müşteri
          bildirimi (varsa) tetiklenir.
        </p>
      </div>

      {/* Filtre çubuğu */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end xl:flex-nowrap">
          <div className="relative min-w-0 flex-1 xl:max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              strokeWidth={2}
              aria-hidden
            />
            <input
              type="search"
              placeholder="Sipariş no, müşteri adı veya e-posta…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 outline-none ring-brand ring-offset-2 placeholder:text-neutral-400 focus:border-brand/40 focus:bg-white focus:ring-2"
              autoComplete="off"
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto xl:flex-nowrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`min-w-[11rem] rounded-xl py-2.5 text-sm font-medium text-neutral-800 ${inputClass}`}
              aria-label="Durum filtresi"
            >
              <option value="">Tüm durumlar</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label className="flex min-w-[11rem] items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-0.5 ring-brand ring-offset-2 focus-within:border-brand/40 focus-within:ring-2">
              <Calendar className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full min-h-[42px] border-0 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                title="Bu güne göre filtre"
              />
            </label>
            <button
              type="button"
              disabled={exporting || loading}
              onClick={() => csvExport()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-asta-navy shadow-sm transition-colors hover:bg-brand-muted hover:border-brand/25 disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {exporting ? 'CSV…' : 'CSV indir'}
            </button>
          </div>
          <p className="w-full shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500 lg:w-auto lg:text-left xl:ml-auto">
            {loading ? '…' : `${filtered.length} sipariş`}
          </p>
        </div>
      </div>

      {error && !detailOrder && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full divide-y divide-neutral-100 text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3.5">Sipariş no</th>
                <th className="px-5 py-3.5">Müşteri</th>
                <th className="px-5 py-3.5 whitespace-nowrap">E-fatura</th>
                <th className="px-5 py-3.5">Tarih</th>
                <th className="px-5 py-3.5 text-right">Tutar</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-neutral-50/80">
                  <td className="px-5 py-4 align-top font-mono text-sm font-bold text-asta-navy">
                    {orderNoDisplay(o.id)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-neutral-900">{o.fullName}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{o.email}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{o.phone || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 align-top text-xs tabular-nums">
                    <span className={electronicInvoiceTone(o)}>{electronicInvoiceCellLabel(o)}</span>
                  </td>
                  <td className="px-5 py-4 align-top tabular-nums text-neutral-600">
                    {formatTrDate(o.createdAt)}
                  </td>
                  <td className="px-5 py-4 align-top text-right text-sm font-semibold tabular-nums text-brand">
                    {formatTRY(Number(o.totalAmount) || 0)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(o.status)}`}
                    >
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(o)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-hover"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailOrder && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div
            className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-neutral-50 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-100 bg-white px-5 py-4">
              <div>
                <h3 id="order-detail-title" className="text-xl font-semibold text-asta-navy">
                  Sipariş detayı
                </h3>
                <p className="mt-1 font-mono text-sm text-neutral-500">{orderNoDisplay(detailOrder.id)}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-transparent p-2 text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-neutral-50 hover:text-asta-navy"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
              )}

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <User className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Müşteri bilgileri
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-neutral-500">Ad soyad</p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">{detailOrder.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">E-posta</p>
                    <p className="mt-0.5 break-all text-sm font-medium text-neutral-900">{detailOrder.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Telefon</p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-900">{detailOrder.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Sipariş tarihi</p>
                    <p className="mt-0.5 text-sm tabular-nums font-medium text-neutral-900">
                      {formatTrDate(detailOrder.createdAt)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <MapPin className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Teslimat adresi
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{detailOrder.address}</p>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <FileText className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Fatura / entegrasyon
                </div>
                <div className="grid gap-3 text-sm">
                  <p>
                    <span className="text-xs text-neutral-500">E-belge süreci (entegrasyon)</span>{' '}
                    <span className={`inline-block ${electronicInvoiceTone(detailOrder)} ml-2`}>
                      {electronicInvoiceCellLabel(detailOrder)}
                    </span>
                    {detailOrder.eInvoiceIntegrationRef ? (
                      <span className="mt-1 block font-mono text-xs text-neutral-600">
                        Ref: {detailOrder.eInvoiceIntegrationRef}
                      </span>
                    ) : null}
                    {detailOrder.eInvoiceLastError ? (
                      <span className="mt-2 block rounded-md bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-900 ring-1 ring-rose-200">
                        {String(detailOrder.eInvoiceLastError)}
                      </span>
                    ) : null}
                  </p>
                  {detailOrder.wantsElectronicInvoice ? (
                    <>
                      <p>
                        <span className="text-xs text-neutral-500">VKN / TCKN</span>
                        <span className="mt-1 block font-mono tabular-nums font-medium">
                          {detailOrder.invoiceTaxNumber || '—'}
                        </span>
                      </p>
                      <p>
                        <span className="text-xs text-neutral-500">Ünvan</span>
                        <span className="mt-1 block font-medium">{detailOrder.invoiceCompanyTitle || '—'}</span>
                      </p>
                      {detailOrder.invoiceTaxOffice ? (
                        <p>
                          <span className="text-xs text-neutral-500">Vergi dairesi</span>
                          <span className="mt-1 block">{detailOrder.invoiceTaxOffice}</span>
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-neutral-600">
                      Müşteri kurumsal fatura talebinde bulunmadı; sistem bireysel/varsayılan kimlik ve ünvan ile Paraşüt
                      taslak satış faturası oluşturur (TCKN gerektiğinde yer tutucu kullanılabilir).
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <ShoppingCart className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Sipariş içeriği
                </div>
                <ul className="divide-y divide-neutral-100">
                  {modalItems.length === 0 && (
                    <li className="py-3 text-sm text-neutral-500">Kalem yok.</li>
                  )}
                  {modalItems.map((it, idx) => {
                    const name = String(it.name || 'Ürün');
                    const qty = Number(it.quantity) || 0;
                    const price = Number(it.price) || 0;
                    const line = price * qty;
                    return (
                      <li key={it.id || idx} className="flex gap-3 py-3 first:pt-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900">{name}</p>
                        </div>
                        <div className="shrink-0 text-right text-sm tabular-nums text-neutral-600">
                          <span className="text-neutral-500">×{qty}</span>
                          <p className="mt-0.5 font-semibold text-neutral-800">{formatTRY(line)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="text-sm font-semibold text-asta-navy">Toplam</span>
                  <span className="text-lg font-bold tabular-nums text-brand">
                    {formatTRY(Number(detailOrder.totalAmount) || 0)}
                  </span>
                </div>
              </section>

              {(detailOrder.status === 'hazirlaniyor' || detailOrder.status === 'kargolandi') && (
                <section className="rounded-xl border-2 border-brand/25 bg-brand-muted/30 p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-brand">
                    <Truck className="h-4 w-4" strokeWidth={1.75} />
                    Kargoya ver (DHL)
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-neutral-700">
                    DHL’den aldığınız takip numarasını girin. Kayıt sonrası sipariş &quot;Kargoda&quot; olur ve
                    müşteriye e-posta gider.
                  </p>
                  <label className="text-xs font-semibold text-neutral-600">DHL takip numarası *</label>
                  <input
                    type="text"
                    placeholder="Örn: 1234567890"
                    value={modalTracking}
                    onChange={(e) => setModalTracking(e.target.value)}
                    className={`mt-1 ${inputClass} rounded-xl`}
                  />
                  <button
                    type="button"
                    disabled={shipping || !(modalTracking || '').trim()}
                    onClick={() => shipOrder()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-hover disabled:bg-neutral-300 disabled:text-neutral-600"
                  >
                    <Truck className="h-4 w-4" strokeWidth={2} />
                    {shipping ? 'Gönderiliyor…' : 'Kargoya ver ve müşteriye bildir'}
                  </button>
                </section>
              )}

              <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <RotateCcw className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Durumu güncelle (manuel)
                </div>
                {detailOrder.status === 'odeme_bekleniyor' && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                    Bu sipariş ödeme bekliyor. Onay sonrası &quot;Hazırlanıyor&quot; veya diğer adımlara
                    geçebilirsiniz.
                  </p>
                )}
                <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                  Kargoya verme işlemini yukarıdaki <span className="font-semibold text-asta-navy">Kargoya
                  ver (DHL)</span> kartından yapın. Aşağıdaki butonlar yalnızca diğer durum geçişleri içindir.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {QUICK_STATUS_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const active = modalStatus === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setModalStatus(value)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                          active
                            ? 'border-brand bg-brand-muted text-brand ring-2 ring-brand/30'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-brand/25 hover:bg-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                {detailOrder.trackingNumber ? (
                  <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] font-medium text-neutral-600 ring-1 ring-neutral-200">
                    Mevcut takip no: <span className="font-bold text-asta-navy">{detailOrder.trackingNumber}</span>
                  </p>
                ) : null}
              </section>
            </div>

            <div className="shrink-0 border-t border-neutral-100 bg-white px-4 py-4 sm:px-5">
              <button
                type="button"
                disabled={saving || unchanged}
                onClick={() => saveDetail()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-hover disabled:bg-neutral-300 disabled:text-neutral-600"
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
                {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
