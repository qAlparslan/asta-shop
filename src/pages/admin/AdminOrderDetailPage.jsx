import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { apiFetch, getToken } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { inputClass } from '../../lib/formStyles.js';
import { displayOrderNumber } from '../../lib/orderDisplayNumber.js';
import { orderInvoicePending, orderInvoiceUploaded } from '../../lib/orderInvoiceUi.js';
import { pickProductImagePath } from '../../lib/productMap.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { markOrderLabelPrinted } from '../../lib/adminOrderLabelPrinted.js';
import AdminCopyable, { AdminDetailField } from './AdminCopyable.jsx';
import AdminOrderInvoicePdfZone from './AdminOrderInvoicePdfZone.jsx';
import {
  adminOrderDetailTitle,
  adminOrderProductsSectionTitle,
  adminOrderTabLabel,
  deliveryNumber,
  formatBillingAddressBlock,
  formatOrderTimelineDate,
  formatShippingAddressBlock,
  packageNumber,
  parseOrderItems,
} from './adminOrderDisplayHelpers.js';

/** @type {{ value: string; label: string; icon: import('lucide-react').LucideIcon }[]} */
const QUICK_STATUS_OPTIONS = [
  { value: 'hazirlaniyor', label: 'Hazırlanıyor', icon: Clock },
  { value: 'teslim-edildi', label: 'Teslim edildi', icon: CheckCircle2 },
  { value: 'iptal-edildi', label: 'İptal et', icon: XCircle },
];

/**
 * @param {{
 *   done: boolean;
 *   active?: boolean;
 *   title: string;
 *   subtitle?: string;
 *   date?: string;
 *   icon?: 'check' | 'truck';
 *   last?: boolean;
 * }} p
 */
function TimelineStep({ done, active, title, subtitle, date, icon = 'check', last = false }) {
  const Icon = icon === 'truck' ? Truck : CheckCircle2;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
            done
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
              : active
                ? 'border-brand bg-brand-muted text-brand'
                : 'border-neutral-200 bg-neutral-50 text-neutral-300'
          }`}
        >
          {done || active ? (
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
          ) : (
            <span className="h-2 w-2 rounded-full bg-neutral-200" />
          )}
        </div>
        {!last ? (
          <div className={`my-1 w-0.5 flex-1 min-h-[2rem] ${done ? 'bg-emerald-300' : 'bg-neutral-200'}`} />
        ) : null}
      </div>
      <div className={`pb-6 ${last ? 'pb-0' : ''}`}>
        <p className={`text-sm font-semibold ${done || active ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {title}
        </p>
        {subtitle ? <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p> : null}
        {date && date !== '—' ? (
          <p className="mt-1 text-xs tabular-nums text-neutral-600">{date}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalStatus, setModalStatus] = useState('');
  const [modalTracking, setModalTracking] = useState('');
  const [saving, setSaving] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mngAutoShip, setMngAutoShip] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/orders')
      .then((res) => {
        const list = Array.isArray(res?.data?.orders) ? res.data.orders : [];
        const found = list.find((o) => String(o.id) === String(orderId));
        if (!found) {
          setOrder(null);
          setError('Sipariş bulunamadı.');
          return;
        }
        setOrder(found);
        setModalStatus(String(found.status || ''));
        setModalTracking(String(found.trackingNumber || ''));
      })
      .catch((e) => setError(e.message || 'Sipariş yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch('/api/orders/shipping/mng-config')
      .then((res) => setMngAutoShip(Boolean(res?.data?.mngAutoShipEnabled)))
      .catch(() => setMngAutoShip(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('yonetim') === '1') {
      setAdminOpen(true);
    }
  }, [searchParams]);

  const status = String(order?.status || '');
  const orderNo = order ? displayOrderNumber(order) : '—';
  const items = useMemo(() => (order ? parseOrderItems(order.items) : []), [order]);
  const invoiceMissing = order ? orderInvoicePending(order) : false;
  const invoiceDone = order ? orderInvoiceUploaded(order) : false;
  const isCorporate = Boolean(order?.wantsElectronicInvoice);

  const timeline = useMemo(() => {
    if (!order) return [];
    const created = formatOrderTimelineDate(order.createdAt);
    const shipped = order.shippedAt ? formatOrderTimelineDate(order.shippedAt) : '—';
    const delivered =
      status === 'teslim-edildi' && order.updatedAt
        ? formatOrderTimelineDate(order.updatedAt)
        : '—';
    const paid = status !== 'odeme_bekleniyor' && status !== 'iptal-edildi';
    const prepared = ['hazirlaniyor', 'kargolandi', 'teslim-edildi'].includes(status);
    const inCargo = ['kargolandi', 'teslim-edildi'].includes(status);
    const deliveredDone = status === 'teslim-edildi';

    return [
      {
        key: 'order',
        title: 'Sipariş tarihi',
        subtitle: paid ? 'Ödemesi alındı' : undefined,
        date: created,
        done: paid,
        active: !paid,
      },
      {
        key: 'pack',
        title: 'Paket hazırlandı',
        date: prepared ? created : '—',
        done: prepared,
        active: paid && !prepared,
      },
      {
        key: 'ship',
        title: 'Kargoya teslim edildi',
        date: inCargo ? shipped : '—',
        done: inCargo,
        active: prepared && !inCargo,
      },
      {
        key: 'deliver',
        title: 'Müşteriye teslim edildi',
        date: deliveredDone ? delivered : '—',
        done: deliveredDone,
        active: inCargo && !deliveredDone,
        icon: 'truck',
        last: true,
      },
    ];
  }, [order, status]);

  const shipOrder = async () => {
    if (!order) return;
    const no = (modalTracking || '').trim();
    if (!mngAutoShip && !no) {
      setError('Kargo takip numarası zorunludur.');
      return;
    }
    setShipping(true);
    setError('');
    try {
      await apiFetch(`/api/orders/${order.id}/ship`, {
        method: 'POST',
        body: no ? { trackingNumber: no } : {},
      });
      await load();
    } catch (e) {
      setError(e.message || 'Kargoya verilemedi.');
    } finally {
      setShipping(false);
    }
  };

  const downloadShippingLabel = async () => {
    if (!order) return;
    try {
      const token = getToken();
      const origin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
      const res = await fetch(`${origin}/api/orders/${order.id}/shipping-label`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Etiket indirilemedi.');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kargo-etiket-${displayOrderNumber(order)}.zpl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Etiket indirilemedi.');
    }
  };

  const saveDetail = async () => {
    if (!order) return;
    setSaving(true);
    setError('');
    try {
      await apiFetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        body: {
          status: modalStatus,
          trackingNumber: modalTracking.trim() || null,
        },
      });
      await load();
    } catch (e) {
      setError(e.message || 'Güncelleme başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const printLabel = () => {
    if (!order) return;
    const w = window.open('', '_blank', 'width=520,height=640');
    if (!w) return;
    w.document.write(
      `<html><head><title>Kargo etiketi ${orderNo}</title></head><body style="font-family:sans-serif;padding:16px"><h2>Sipariş ${orderNo}</h2><p>${order.fullName}</p><p>${order.address}</p><p>${order.shippingDistrict || ''} ${order.shippingProvince || ''}</p><p>${order.phone}</p></body></html>`,
    );
    w.document.close();
    w.print();
    markOrderLabelPrinted(String(order.id));
  };

  const unchanged =
    order &&
    modalStatus === order.status &&
    (modalTracking || '').trim() === String(order.trackingNumber || '').trim();

  const carrierLabel = String(order?.carrier || '').trim() || 'Asta Kargo';

  if (loading) {
    return (
      <p className="py-20 text-center text-sm text-neutral-500">Sipariş yükleniyor…</p>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700">{error || 'Sipariş bulunamadı.'}</p>
        <Link to="/admin/siparisler" className="text-sm font-semibold text-brand hover:underline">
          ← Sipariş yönetimine dön
        </Link>
      </div>
    );
  }

  const shippingBlock = formatShippingAddressBlock(order);
  const billingBlock = formatBillingAddressBlock(order);

  return (
    <div className="space-y-6 font-sans pb-10">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link to="/admin/siparisler" className="font-medium hover:text-brand">
          Sipariş yönetimi
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium text-neutral-700">{adminOrderTabLabel(status)}</span>
      </nav>

      <h2 className="text-2xl font-semibold tracking-tight text-asta-navy">
        {adminOrderDetailTitle(status)}
      </h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="flex flex-col lg:flex-row">
          <aside className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-6 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
            {timeline.map((step, idx) => (
              <TimelineStep
                key={step.key}
                done={step.done}
                active={step.active}
                title={step.title}
                subtitle={step.subtitle}
                date={step.date}
                icon={step.icon}
                last={idx === timeline.length - 1}
              />
            ))}
          </aside>

          <div className="min-w-0 flex-1 p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <AdminDetailField label="Müşteri bilgileri" copyText={String(order.fullName || '—')} />
                <AdminDetailField label="Sipariş no" copyText={orderNo} />
                <AdminDetailField label="Teslimat no" copyText={deliveryNumber(order)} />
                <AdminDetailField label="Paket no" copyText={packageNumber(order)} />
                <AdminDetailField
                  label="Takip no"
                  copyText={String(order.trackingNumber || '').trim() || '—'}
                />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-neutral-500">Toplam tutar</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
                  <AdminCopyable
                    text={formatTRY(Number(order.totalAmount) || 0)}
                    className="justify-end text-2xl font-bold"
                  />
                </p>
              </div>
            </div>

            <div className="grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <AdminDetailField label="Kargo bilgileri" copyText={carrierLabel} />
              <AdminDetailField label="Desi" copyText="1" />
              <AdminDetailField label="Teslim alacak kişi" copyText={String(order.fullName || '—')} />
              <AdminDetailField label="E-posta adresi" copyText={String(order.email || '—')} />
            </div>

            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-neutral-500">Teslimat adresi</p>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-neutral-900">
                  <AdminCopyable text={shippingBlock} multiline />
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-neutral-500">Fatura adresi</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isCorporate
                        ? 'bg-sky-100 text-sky-900'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {isCorporate ? 'Kurumsal Müşteri' : 'Bireysel Müşteri'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold leading-relaxed text-neutral-900">
                  <AdminCopyable text={billingBlock} multiline />
                </div>
                {isCorporate && order.invoiceCompanyTitle ? (
                  <p className="mt-2 text-xs text-neutral-600">
                    Unvan:{' '}
                    <AdminCopyable text={String(order.invoiceCompanyTitle)} className="inline" />
                  </p>
                ) : null}
                {isCorporate && order.invoiceTaxNumber ? (
                  <p className="mt-1 text-xs text-neutral-600">
                    VKN/TCKN:{' '}
                    <AdminCopyable text={String(order.invoiceTaxNumber)} className="inline" />
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {invoiceMissing ? (
                <span className="inline-flex rounded border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  Faturası yüklenmemiş
                </span>
              ) : invoiceDone ? (
                <span className="inline-flex rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Fatura yüklendi
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-lg font-semibold text-asta-navy">
              {adminOrderProductsSectionTitle(status)}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Fiyatlar birim bazında hesaplanmıştır; KDV dahildir.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={printLabel}
              className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-900 hover:bg-orange-100"
            >
              Etiketi yazdır
            </button>
            {status === 'teslim-edildi' ? (
              <AdminOrderInvoicePdfZone
                orderId={String(order.id)}
                hasInvoice={invoiceDone}
                onSuccess={load}
                compact
              />
            ) : null}
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Diğer işlemler {adminOpen ? '▴' : '▾'}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-neutral-100">
          {items.length === 0 ? (
            <li className="px-6 py-8 text-sm text-neutral-500">Ürün kalemi yok.</li>
          ) : null}
          {items.map((it, idx) => {
            const name = String(it.name || 'Ürün');
            const qty = Number(it.quantity) || 0;
            const price = Number(it.price) || 0;
            const line = price * qty;
            const barcode = String(it.barcode ?? '').trim() || '—';
            const sku = String(it.sku ?? it.id ?? '').trim() || '—';
            const imgPath = pickProductImagePath(it.images);
            const imgSrc = imgPath ? mediaUrl(imgPath) : '';

            return (
              <li key={it.id || idx} className="px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                        Görsel yok
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-neutral-900">
                      <AdminCopyable text={name} />
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <AdminDetailField label="Barkod" copyText={barcode} />
                      <AdminDetailField label="Stok kodu" copyText={sku} />
                      <AdminDetailField label="Adet" copyText={String(qty)} />
                      <div>
                        <p className="text-xs font-medium text-neutral-500">Satış fiyatı</p>
                        <p className="mt-1 text-base font-bold tabular-nums text-emerald-700">
                          <AdminCopyable text={formatTRY(line)} />
                        </p>
                        {qty > 1 ? (
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            Birim: <AdminCopyable text={formatTRY(price)} className="inline text-[11px]" />
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {adminOpen ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Sipariş yönetimi</h3>

          {(status === 'hazirlaniyor' || status === 'kargolandi') && (
            <section className="rounded-xl border-2 border-brand/25 bg-brand-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
                <Truck className="h-4 w-4" strokeWidth={1.75} />
                Kargoya ver
              </div>
              <p className="mb-3 text-xs leading-relaxed text-neutral-700">
                {mngAutoShip
                  ? 'DHL eCommerce (MNG) API ile gönderi ve barkod oluşturulur; takip numarası otomatik kaydedilir.'
                  : 'Kargo takip numarasını girin; sipariş kargoda olur ve müşteriye e-posta gider.'}
              </p>
              {!mngAutoShip ? (
                <>
                  <label className="text-xs font-semibold text-neutral-600">Kargo takip numarası *</label>
                  <input
                    type="text"
                    placeholder="Örn: 614118757013"
                    value={modalTracking}
                    onChange={(e) => setModalTracking(e.target.value)}
                    className={`mt-1 ${inputClass} rounded-xl`}
                  />
                </>
              ) : null}
              <button
                type="button"
                disabled={shipping || (!mngAutoShip && !(modalTracking || '').trim())}
                onClick={() => shipOrder()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:bg-neutral-300"
              >
                <Truck className="h-4 w-4" strokeWidth={2} />
                {shipping
                  ? 'Gönderiliyor…'
                  : mngAutoShip
                    ? 'DHL ile kargoya ver'
                    : 'Kargoya ver ve müşteriye bildir'}
              </button>
              {order.mngLabelPayload ? (
                <button
                  type="button"
                  onClick={() => downloadShippingLabel()}
                  className="mt-2 block text-xs font-semibold text-brand hover:underline"
                >
                  Kargo etiketini indir
                </button>
              ) : null}
            </section>
          )}

          <section className="rounded-xl border border-neutral-200 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              <RotateCcw className="h-4 w-4 text-brand" strokeWidth={1.75} />
              Durumu güncelle
            </div>
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
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-brand/25'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving || unchanged}
              onClick={() => saveDetail()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:bg-neutral-300"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
              {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
            </button>
          </section>

          <button
            type="button"
            onClick={() => navigate('/admin/siparisler')}
            className="text-sm font-semibold text-neutral-600 hover:text-brand"
          >
            ← Listeye dön
          </button>
        </div>
      ) : (
        <p className="text-center">
          <button
            type="button"
            onClick={() => navigate('/admin/siparisler')}
            className="text-sm font-semibold text-brand hover:underline"
          >
            ← Sipariş listesine dön
          </button>
        </p>
      )}
    </div>
  );
}
