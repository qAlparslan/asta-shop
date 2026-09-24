const STORAGE_KEY = 'asta_admin_label_printed_ids';

/** @returns {Set<string>} */
export function getLabelPrintedOrderIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/** @param {string} orderId */
export function markOrderLabelPrinted(orderId) {
  const id = String(orderId || '').trim();
  if (!id || typeof window === 'undefined') return;
  const set = getLabelPrintedOrderIds();
  set.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** @param {string} orderId */
export function isOrderLabelPrinted(orderId) {
  return getLabelPrintedOrderIds().has(String(orderId || ''));
}
