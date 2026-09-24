/**
 * Müşteri / admin sipariş numarası (10–11 hane). UUID gösterilmez.
 * @param {{ orderNumber?: string | null; id?: string } | null | undefined} order
 */
export function displayOrderNumber(order) {
  const n = String(order?.orderNumber ?? '').replace(/\D/g, '');
  if (n.length >= 10 && n.length <= 11) return n;
  return '—';
}

/** @param {string | null | undefined} text */
export async function copyToClipboard(text) {
  const v = String(text ?? '').trim();
  if (!v || typeof navigator === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(v);
    return true;
  } catch {
    return false;
  }
}

/** @param {string | Date | undefined | null} v */
export function formatOrderDateMarketplace(v) {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}
