import { ChevronRight, Truck } from 'lucide-react';
import { formatTRY } from '../../lib/formatTRY.js';
import { pickProductImagePath } from '../../lib/productMap.js';
import { mediaUrl } from '../../lib/mediaUrl.js';
import { displayOrderNumber, formatOrderDateMarketplace } from '../../lib/orderDisplayNumber.js';
import { orderInvoicePending, orderInvoiceUploaded } from '../../lib/orderInvoiceUi.js';
import { orderStatusLabel } from './constants.js';
import AdminCopyable from './AdminCopyable.jsx';
import AdminOrderInvoicePdfZone from './AdminOrderInvoicePdfZone.jsx';
import { deliveryNumber, packageNumber, parseOrderItems } from './adminOrderDisplayHelpers.js';

const cell = 'flex min-h-[148px] flex-col border-neutral-200 px-4 py-4 lg:border-l lg:first:border-l-0';

/**
 * @param {{
 *   order: Record<string, unknown>;
 *   onDetail: (o: Record<string, unknown>) => void;
 *   showInvoiceUpload?: boolean;
 *   onInvoiceUploaded?: () => void;
 *   onLabelPrinted?: (orderId: string) => void;
 * }} props
 */
export default function AdminOrderMarketplaceRow({
  order,
  onDetail,
  showInvoiceUpload = false,
  onInvoiceUploaded,
  onLabelPrinted,
}) {
  const items = parseOrderItems(order.items);
  const first = items[0] || {};
  const extra = items.length > 1 ? items.length - 1 : 0;
  const imgPath = pickProductImagePath(first.images);
  const imgSrc = imgPath ? mediaUrl(imgPath) : '';
  const orderNo = displayOrderNumber(order);
  const barcodeFromItems = items
    .map((it) => String(it?.barcode ?? '').trim())
    .find(Boolean);
  const barcode = barcodeFromItems || '—';
  const title = String(first.name || 'Ürün');
  const status = String(order.status || '');
  const invoiceMissing = orderInvoicePending(order);
  const invoiceDone = orderInvoiceUploaded(order);
  const orderId = String(order.id || '');

  const printLabel = () => {
    const w = window.open('', '_blank', 'width=520,height=640');
    if (!w) return;
    w.document.write(
      `<html><head><title>Kargo etiketi ${orderNo}</title></head><body style="font-family:sans-serif;padding:16px"><h2>Sipariş ${orderNo}</h2><p>${order.fullName}</p><p>${order.address}</p><p>${order.shippingDistrict || ''} ${order.shippingProvince || ''}</p><p>${order.phone}</p></body></html>`,
    );
    w.document.close();
    w.print();
    onLabelPrinted?.(orderId);
  };

  return (
    <article className="border-b border-neutral-200 bg-white last:border-b-0">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className={cell}>
          <div className="flex gap-3">
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-50">
              {imgSrc ? (
                <img src={imgSrc} alt="" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">Görsel yok</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-3 text-sm font-semibold leading-snug text-neutral-900">
                {title}
                {extra > 0 ? (
                  <span className="ml-1 font-normal text-neutral-500">(+{extra} ürün)</span>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-neutral-600">
                <span className="text-neutral-500">Barkod:</span>{' '}
                <AdminCopyable text={barcode} className="font-medium text-neutral-800" />
              </p>
              {showInvoiceUpload ? (
                <AdminOrderInvoicePdfZone
                  orderId={orderId}
                  hasInvoice={invoiceDone}
                  onSuccess={() => onInvoiceUploaded?.()}
                />
              ) : null}
              {invoiceMissing ? (
                <span
                  className={`inline-flex rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ${showInvoiceUpload ? 'mt-2' : 'mt-3'}`}
                >
                  Faturası yüklenmemiş
                </span>
              ) : invoiceDone && ['hazirlaniyor', 'kargolandi', 'teslim-edildi'].includes(status) ? (
                <span className="mt-2 inline-flex rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  Fatura yüklendi
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className={cell}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Sipariş numarası</p>
          <p className="mt-1 text-base font-bold text-neutral-900">
            <AdminCopyable text={orderNo} />
          </p>
          <p className="mt-3 text-sm font-bold uppercase tracking-wide text-neutral-900">{order.fullName}</p>
          <p className="mt-2 text-xs text-neutral-600">
            <AdminCopyable text={formatOrderDateMarketplace(order.createdAt)} />
          </p>
        </div>

        <div className={cell}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Kargo / teslimat</p>
          {status === 'hazirlaniyor' ? (
            <>
              <p className="mt-2 text-sm font-semibold text-neutral-800">Gönderime hazır</p>
              <p className="mt-1 text-xs text-neutral-500">Kargoya verildiğinde takip no burada görünür.</p>
            </>
          ) : null}
          {status === 'kargolandi' ? (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                <Truck className="h-4 w-4 text-brand" strokeWidth={1.75} aria-hidden />
                Kargoda
              </p>
              <p className="mt-2 text-xs text-neutral-600">
                Takip: <AdminCopyable text={String(order.trackingNumber || '—')} className="font-semibold" />
              </p>
              {order.shippedAt ? (
                <p className="mt-1 text-xs text-neutral-500">
                  {formatOrderDateMarketplace(order.shippedAt)}
                </p>
              ) : null}
            </>
          ) : null}
          {status === 'teslim-edildi' ? (
            <>
              <p className="mt-2 text-sm font-semibold text-emerald-800">Teslim edildi</p>
              <p className="mt-1 text-xs text-neutral-500">{orderStatusLabel(status)}</p>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => onDetail(order)}
            className="mt-auto pt-3 text-left text-xs font-semibold text-sky-700 hover:underline"
          >
            Teslimat / fatura adresi
          </button>
        </div>

        <div className={cell}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Toplam tutar</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-neutral-900">
            {formatTRY(Number(order.totalAmount) || 0)}
          </p>
          <button
            type="button"
            onClick={() => onDetail(order)}
            className="mt-auto pt-2 text-left text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
          >
            Tutar detayı
          </button>
        </div>

        <div className={cell}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Teslimat numarası</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            <AdminCopyable text={deliveryNumber(order)} />
          </p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-neutral-500">Paket numarası</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            <AdminCopyable text={packageNumber(order)} />
          </p>
        </div>

        <div className={`${cell} gap-2`}>
          <button
            type="button"
            onClick={printLabel}
            className="w-full rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 hover:bg-orange-100"
          >
            Etiketi yazdır
          </button>
          <button
            type="button"
            onClick={() => onDetail(order)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
          >
            Detaya git
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onDetail(order)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Diğer işlemler ▾
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminOrderMarketplaceHeader() {
  const head =
    'hidden border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-neutral-500 lg:grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,0.95fr)]';
  const hcell = 'border-neutral-200 lg:border-l lg:px-0 lg:first:border-l-0';
  return (
    <div className={head}>
      <div className={hcell}>Ürün bilgileri</div>
      <div className={`${hcell} lg:pl-4`}>Sipariş bilgileri</div>
      <div className={`${hcell} lg:pl-4`}>Kargo / teslimat bilgileri</div>
      <div className={`${hcell} lg:pl-4`}>Toplam tutar</div>
      <div className={`${hcell} lg:pl-4`}>Paket bilgileri</div>
      <div className={`${hcell} lg:pl-4`}>İşlemler</div>
    </div>
  );
}
