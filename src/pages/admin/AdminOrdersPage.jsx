import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  MapPin,
  RotateCcw,
  ShoppingCart,
  Truck,
  User,
  X,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';
import { apiFetch, downloadAuthorizedFile } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { inputClass } from '../../lib/formStyles.js';
import { orderStatusLabel } from './constants.js';
import { displayOrderNumber } from '../../lib/orderDisplayNumber.js';
import AdminOrderMarketplaceRow, {
  AdminOrderMarketplaceHeader,
} from './AdminOrderMarketplaceRow.jsx';
import AdminOrdersFilterSortBar from './AdminOrdersFilterSortBar.jsx';
import {
  DEFAULT_ADMIN_ORDER_LIST_FILTERS,
  filterAndSortAdminOrders,
} from './adminOrderListFilters.js';
import { markOrderLabelPrinted } from '../../lib/adminOrderLabelPrinted.js';

/** @param {string | Date | undefined | null} v */
function formatTrDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${mo}.${y} ${h}:${min}`;
  }
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

/** @type {{ status: string; label: string; icon: import('lucide-react').LucideIcon }[]} */
const ORDER_WORKFLOW_TABS = [
  { status: 'hazirlaniyor', label: 'Gönderime Hazır', icon: Package },
  { status: 'kargolandi', label: 'Kargoda', icon: Truck },
  { status: 'teslim-edildi', label: 'Teslim Edildi', icon: CheckCircle2 },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('hazirlaniyor');
  const [listFilters, setListFilters] = useState(() => ({ ...DEFAULT_ADMIN_ORDER_LIST_FILTERS }));
  const [sortKey, setSortKey] = useState('createdAt_desc');
  const [labelPrintedTick, setLabelPrintedTick] = useState(0);

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

  const tabCounts = useMemo(() => {
    const counts = { hazirlaniyor: 0, kargolandi: 0, 'teslim-edildi': 0 };
    for (const o of orders) {
      const st = String(o.status || '');
      if (st in counts) counts[st] += 1;
    }
    return counts;
  }, [orders]);

  const tabOrders = useMemo(
    () => orders.filter((o) => o.status === activeTab),
    [orders, activeTab],
  );

  const filtered = useMemo(
    () =>
      filterAndSortAdminOrders(orders, {
        activeTab,
        query,
        filters: listFilters,
        sortKey,
      }),
    [orders, activeTab, query, listFilters, sortKey, labelPrintedTick],
  );

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
      setError('Kargoya vermek için kargo takip numarası zorunludur.');
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
      setActiveTab('kargolandi');
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
          Gönderime hazır, kargoda ve teslim edilen siparişleri sekmelerden yönetin; detayda durum ve kargo kodunu
          güncelleyin.
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sipariş durumu sekmeleri"
      >
        {ORDER_WORKFLOW_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.status;
          const count = tabCounts[tab.status] ?? 0;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.status)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-neutral-200 bg-white text-asta-navy hover:border-brand/30 hover:bg-brand-muted/30'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {tab.label}
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <AdminOrdersFilterSortBar
        query={query}
        setQuery={setQuery}
        filters={listFilters}
        setFilters={setListFilters}
        sortKey={sortKey}
        setSortKey={setSortKey}
        onExportCsv={csvExport}
        exporting={exporting}
        loading={loading}
        resultCount={filtered.length}
        totalInTab={tabOrders.length}
      />

      {error && !detailOrder && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <AdminOrderMarketplaceHeader />
        {loading ? (
          <p className="px-5 py-14 text-center text-sm text-neutral-500">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-neutral-500">Kayıt yok.</p>
        ) : (
          <div className="min-w-[960px] overflow-x-auto">
            {filtered.map((o) => (
              <AdminOrderMarketplaceRow
                key={o.id}
                order={o}
                onDetail={openDetail}
                showInvoiceUpload={activeTab === 'teslim-edildi'}
                onInvoiceUploaded={load}
                onLabelPrinted={(id) => {
                  markOrderLabelPrinted(id);
                  setLabelPrintedTick((t) => t + 1);
                }}
              />
            ))}
          </div>
        )}
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
                <p className="mt-1 font-mono text-sm text-neutral-500">{displayOrderNumber(detailOrder)}</p>
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
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                  {detailOrder.address}
                  {detailOrder.shippingDistrict || detailOrder.shippingProvince ? (
                    <>
                      <br />
                      <span className="text-neutral-600">
                        {[detailOrder.shippingDistrict, detailOrder.shippingProvince]
                          .filter(Boolean)
                          .join(' / ')}
                      </span>
                    </>
                  ) : null}
                </p>
              </section>

              {detailOrder.billingSameAsShipping === false ? (
                <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    <MapPin className="h-4 w-4 text-brand" strokeWidth={1.75} />
                    Fatura adresi (teslimattan farklı)
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                    {detailOrder.billingAddress}
                    <br />
                    <span className="text-neutral-600">
                      {[detailOrder.billingDistrict, detailOrder.billingProvince].filter(Boolean).join(' / ')}
                    </span>
                  </p>
                </section>
              ) : null}

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
                    Kargoya ver
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-neutral-700">
                    Kargo takip numarasını girin. Kayıt sonrası sipariş &quot;Kargoda&quot;
                    durumuna geçer ve müşteriye e-posta gider.
                  </p>
                  <label className="text-xs font-semibold text-neutral-600">Kargo takip numarası *</label>
                  <input
                    type="text"
                    placeholder="Örn: 614118757013"
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
                  ver</span> kartından yapın. Aşağıdaki butonlar yalnızca diğer durum geçişleri içindir.
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
