import { displayOrderNumber } from '../../lib/orderDisplayNumber.js';

/** @param {unknown} raw */
export function parseOrderItems(raw) {
  if (!raw) return [];
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @param {Record<string, unknown>} order */
export function deliveryNumber(order) {
  const tr = String(order.trackingNumber || '').trim();
  if (tr) return tr;
  const no = displayOrderNumber(order);
  if (no === '—') return '—';
  return `6275${no}`.slice(0, 14);
}

/** @param {Record<string, unknown>} order */
export function packageNumber(order) {
  const no = displayOrderNumber(order);
  if (no === '—') return '—';
  return no.length > 10 ? no.slice(0, 10) : no;
}

/** @param {string | Date | undefined | null} v */
export function formatOrderTimelineDate(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/** @param {Record<string, unknown>} order */
export function formatShippingAddressBlock(order) {
  const lines = [String(order.address || '').trim()];
  const loc = [order.shippingDistrict, order.shippingProvince].filter(Boolean).join(' / ');
  if (loc) lines.push(loc);
  const phone = String(order.phone || '').trim();
  if (phone) lines.push(phone);
  return lines.filter(Boolean).join('\n') || '—';
}

/** @param {Record<string, unknown>} order */
export function formatBillingAddressBlock(order) {
  if (order.billingSameAsShipping !== false) {
    return formatShippingAddressBlock(order);
  }
  const lines = [String(order.billingAddress || '').trim()];
  const loc = [order.billingDistrict, order.billingProvince].filter(Boolean).join(' / ');
  if (loc) lines.push(loc);
  return lines.filter(Boolean).join('\n') || '—';
}

/** @param {string} status */
export function adminOrderTabLabel(status) {
  if (status === 'hazirlaniyor') return 'Gönderime Hazır';
  if (status === 'kargolandi') return 'Kargoda';
  if (status === 'teslim-edildi') return 'Teslim Edildi';
  return 'Siparişler';
}

/** @param {string} status */
export function adminOrderDetailTitle(status) {
  if (status === 'teslim-edildi') return 'Teslim edildi detay';
  if (status === 'kargolandi') return 'Kargoda detay';
  if (status === 'hazirlaniyor') return 'Gönderime hazır detay';
  return 'Sipariş detay';
}

/** @param {string} status */
export function adminOrderProductsSectionTitle(status) {
  if (status === 'teslim-edildi') return 'Teslim edilen ürünler';
  if (status === 'kargolandi') return 'Kargodaki ürünler';
  return 'Sipariş ürünleri';
}
