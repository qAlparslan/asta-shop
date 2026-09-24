/** @param {Record<string, unknown> | null | undefined} order */
export function orderInvoiceUploaded(order) {
  const path = String(order?.invoicePdfPath ?? '').trim();
  if (path) return true;
  return String(order?.eInvoiceStatus ?? '') === 'submitted';
}

/** Gönderime hazır / kargoda / teslim edildi — fatura henüz yok */
export function orderInvoicePending(order) {
  const status = String(order?.status ?? '');
  if (!['hazirlaniyor', 'kargolandi', 'teslim-edildi'].includes(status)) return false;
  return !orderInvoiceUploaded(order);
}
