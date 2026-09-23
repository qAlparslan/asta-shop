import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { canCustomerCancelOrder, orderStatusLabel } from '../../lib/orderStatus.js';
import OrderTrackingStepper from '../../components/OrderTrackingStepper.jsx';

/** @param {unknown} raw */
function parseOrderItems(raw) {
  if (raw == null) return [];
  try {
    const x = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

/** @param {string | Date | undefined} iso */
function formatOrderDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

/** @param {string} status */
function statusBadgeClass(status) {
  switch (status) {
    case 'teslim-edildi':
      return 'bg-emerald-100 text-emerald-900';
    case 'kargolandi':
      return 'bg-blue-100 text-blue-900';
    case 'hazirlaniyor':
      return 'bg-amber-100 text-amber-900';
    case 'odeme_bekleniyor':
      return 'bg-neutral-200 text-neutral-800';
    case 'iptal-edildi':
      return 'bg-red-100 text-red-900';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTargetId, setCancelTargetId] = useState(/** @type {string | null} */ (null));
  const [cancellingId, setCancellingId] = useState(/** @type {string | null} */ (null));
  const [cancelFeedback, setCancelFeedback] = useState(/** @type {{ type: 'ok' | 'err'; text: string } | null} */ (null));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/orders/me');
      const list = res?.data?.orders;
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Siparişler yüklenemedi.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancelConfirm = async () => {
    const id = cancelTargetId;
    if (!id) return;
    setCancellingId(id);
    setCancelFeedback(null);
    try {
      const res = await apiFetch(`/api/orders/me/${encodeURIComponent(id)}/cancel`, {
        method: 'POST',
        body: {},
      });
      const updated = res?.data?.order;
      setOrders((prev) =>
        prev.map((o) => (String(o.id) === id && updated ? { ...o, ...updated, status: updated.status ?? 'iptal-edildi' } : o)),
      );
      setCancelFeedback({
        type: 'ok',
        text: typeof res?.message === 'string' ? res.message : 'Siparişiniz iptal edildi.',
      });
      setCancelTargetId(null);
    } catch (e) {
      setCancelFeedback({
        type: 'err',
        text: e instanceof Error ? e.message : 'Sipariş iptal edilemedi.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const cancelTargetOrder = cancelTargetId
    ? orders.find((o) => String(o.id) === cancelTargetId)
    : null;
  const cancelTargetStatus = cancelTargetOrder ? String(cancelTargetOrder.status ?? '') : '';

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {cancelFeedback ? (
          <p
            className={`rounded-lg border px-4 py-3 text-sm ${
              cancelFeedback.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="status"
          >
            {cancelFeedback.text}
          </p>
        ) : null}

        {loading ? (
          <p className="text-center text-sm text-neutral-500">Siparişler yükleniyor…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/90 px-6 py-14 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-neutral-400" strokeWidth={1.5} aria-hidden />
            <p className="mt-4 text-sm font-semibold text-neutral-800">Henüz sipariş yok</p>
            <p className="mt-2 text-sm text-neutral-600">Tamamlanan alışverişleriniz burada listelenir.</p>
          </div>
        ) : (
          <ul className="space-y-6">
            {orders.map((o, orderIdx) => {
              const id = String(o.id ?? '');
              const items = parseOrderItems(o.items);
              const qty = items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);
              const status = String(o.status ?? '');
              const total = Number(o.totalAmount);

              return (
                <li
                  key={id || `order-${orderIdx}`}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50/80 px-4 py-4 sm:px-6">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Sipariş</p>
                      <p className="mt-1 font-mono text-sm text-neutral-900">{id || '—'}</p>
                      <p className="mt-2 text-xs text-neutral-600">{formatOrderDate(/** @type {any} */ (o.createdAt))}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}
                      >
                        {orderStatusLabel(status)}
                      </span>
                      <p className="text-base font-bold tabular-nums text-asta-navy">{formatTRY(total)}</p>
                      {canCustomerCancelOrder(status) ? (
                        <button
                          type="button"
                          disabled={cancellingId === id}
                          onClick={() => setCancelTargetId(id)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancellingId === id ? 'İptal ediliyor…' : 'Siparişi iptal et'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-4 py-4 sm:px-6">
                    <p className="text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-800">{items.length}</span> çeşit
                      {qty > 0 ? (
                        <>
                          {' · '}
                          <span className="font-semibold text-neutral-800">{qty}</span> adet
                        </>
                      ) : null}
                      {typeof o.couponCode === 'string' && o.couponCode.trim() ? (
                        <>
                          {' · '}
                          Kupon:{' '}
                          <span className="font-semibold text-brand">{o.couponCode.trim()}</span>
                        </>
                      ) : null}
                    </p>

                    {status !== 'odeme_bekleniyor' && status !== 'iptal-edildi' ? (
                      <OrderTrackingStepper
                        order={{
                          status,
                          trackingNumber: o.trackingNumber,
                          carrier: o.carrier,
                        }}
                      />
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {items.slice(0, 8).map((it, idx) => {
                        const imgs = Array.isArray(it?.images) ? it.images : null;
                        const imgSrc =
                          imgs && imgs[0]
                            ? mediaUrl(String(imgs[0]))
                            : typeof it?.image === 'string'
                              ? mediaUrl(it.image)
                              : '';
                        return (
                          <div
                            key={`${id}-${typeof it?.id === 'string' ? it.id : `i-${idx}`}`}
                            className="flex max-w-[200px] min-w-[140px] flex-1 items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/80 px-2 py-2"
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white">
                              {imgSrc ? (
                                <img src={imgSrc} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">—</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-[11px] font-semibold text-neutral-900">{String(it?.name ?? '')}</p>
                              <p className="mt-0.5 text-[10px] tabular-nums text-neutral-500">
                                ×{Number(it?.quantity) || 0}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {items.length > 8 ? (
                        <p className="flex flex-1 min-w-[100px] items-center justify-center text-xs font-medium text-neutral-500">
                          +{items.length - 8} ürün…
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {cancelTargetId ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            onClick={() => (cancellingId ? null : setCancelTargetId(null))}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="cancel-order-title" className="text-lg font-bold text-neutral-900">
                Siparişi iptal et
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                <span className="font-mono font-semibold text-neutral-800">{cancelTargetId}</span> numaralı sipariş
                iptal edilecek. Bu işlem geri alınamaz.
              </p>
              {cancelTargetStatus === 'hazirlaniyor' ? (
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  Ödemeniz PayTR üzerinden otomatik iade edilir; banka/kartınıza yansıması birkaç iş günü sürebilir.
                  İade başarısız olursa sipariş iptal edilmez — tekrar deneyebilir veya destek ile iletişime geçebilirsiniz.
                </p>
              ) : cancelTargetStatus === 'odeme_bekleniyor' ? (
                <p className="mt-2 text-sm text-neutral-600">
                  Ödeme tamamlanmadıysa rezerve edilen ürünler tekrar satışa açılır.
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(cancellingId)}
                  onClick={() => setCancelTargetId(null)}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={Boolean(cancellingId)}
                  onClick={() => handleCancelConfirm()}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {cancellingId ? 'İptal ediliyor…' : 'Evet, iptal et'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
