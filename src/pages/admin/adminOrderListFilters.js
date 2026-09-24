import { displayOrderNumber } from '../../lib/orderDisplayNumber.js';
import { orderInvoicePending } from '../../lib/orderInvoiceUi.js';
import { isOrderLabelPrinted } from '../../lib/adminOrderLabelPrinted.js';

export const ADMIN_ORDER_SORT_OPTIONS = [
  { id: 'shippedAt_desc', label: 'Kargoya teslim tarihi (En yeni)' },
  { id: 'shippedAt_asc', label: 'Kargoya teslim tarihi (En eski)' },
  { id: 'createdAt_desc', label: 'Sipariş verilme tarihi (En yeni)' },
  { id: 'createdAt_asc', label: 'Sipariş verilme tarihi (En eski)' },
  { id: 'totalAmount_desc', label: 'Toplam satış fiyatı (En yüksek)' },
  { id: 'totalAmount_asc', label: 'Toplam satış fiyatı (En düşük)' },
];

/** @typedef {{
 *   invoiceNotUploaded: boolean;
 *   labelPrinted: boolean;
 *   labelNotPrinted: boolean;
 *   customerIndividual: boolean;
 *   customerCorporate: boolean;
 *   orderDate: string;
 * }} AdminOrderListFilters
 */

export const DEFAULT_ADMIN_ORDER_LIST_FILTERS = {
  invoiceNotUploaded: false,
  labelPrinted: false,
  labelNotPrinted: false,
  customerIndividual: false,
  customerCorporate: false,
  orderDate: '',
};

/** @param {AdminOrderListFilters} f */
export function countActiveAdminOrderFilters(f) {
  let n = 0;
  if (f.invoiceNotUploaded) n += 1;
  if (f.labelPrinted) n += 1;
  if (f.labelNotPrinted) n += 1;
  if (f.customerIndividual) n += 1;
  if (f.customerCorporate) n += 1;
  if (f.orderDate) n += 1;
  return n;
}

/**
 * @param {Record<string, unknown>[]} orders
 * @param {{
 *   activeTab: string;
 *   query: string;
 *   filters: AdminOrderListFilters;
 *   sortKey: string;
 * }} opts
 */
export function filterAndSortAdminOrders(orders, { activeTab, query, filters, sortKey }) {
  const q = query.trim().toLowerCase();
  let list = orders.filter((o) => o.status === activeTab);

  if (filters.orderDate) {
    const [y, m, d] = filters.orderDate.split('-').map(Number);
    if (y && m && d) {
      list = list.filter((o) => {
        const dt = new Date(o.createdAt);
        return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
      });
    }
  }

  if (filters.invoiceNotUploaded) {
    list = list.filter((o) => orderInvoicePending(o));
  }

  if (filters.labelPrinted && !filters.labelNotPrinted) {
    list = list.filter((o) => isOrderLabelPrinted(String(o.id || '')));
  } else if (filters.labelNotPrinted && !filters.labelPrinted) {
    list = list.filter((o) => !isOrderLabelPrinted(String(o.id || '')));
  }

  if (filters.customerIndividual && !filters.customerCorporate) {
    list = list.filter((o) => !o.wantsElectronicInvoice);
  } else if (filters.customerCorporate && !filters.customerIndividual) {
    list = list.filter((o) => Boolean(o.wantsElectronicInvoice));
  }

  if (q) {
    list = list.filter((o) => {
      const orderNo = displayOrderNumber(o);
      return (
        orderNo.includes(q.replace(/\D/g, '')) ||
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

  const sorted = [...list];
  const cmpDate = (a, b, field, dir) => {
    const ta = a[field] ? new Date(a[field]).getTime() : 0;
    const tb = b[field] ? new Date(b[field]).getTime() : 0;
    return dir === 'asc' ? ta - tb : tb - ta;
  };

  switch (sortKey) {
    case 'shippedAt_asc':
      sorted.sort((a, b) => cmpDate(a, b, 'shippedAt', 'asc'));
      break;
    case 'shippedAt_desc':
      sorted.sort((a, b) => cmpDate(a, b, 'shippedAt', 'desc'));
      break;
    case 'createdAt_asc':
      sorted.sort((a, b) => cmpDate(a, b, 'createdAt', 'asc'));
      break;
    case 'totalAmount_desc':
      sorted.sort(
        (a, b) => (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0),
      );
      break;
    case 'totalAmount_asc':
      sorted.sort(
        (a, b) => (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0),
      );
      break;
    case 'createdAt_desc':
    default:
      sorted.sort((a, b) => cmpDate(a, b, 'createdAt', 'desc'));
      break;
  }

  return sorted;
}
