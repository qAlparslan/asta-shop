/** @type {Record<string, string>} */
export const E_INVOICE_STATUS_LABELS = {
  none: 'İşlem yok',
  awaiting_integration: 'Entegrasyon bekliyor',
  submitted: 'Gönderildi',
  pending_manual: 'Manuel işlem',
  failed: 'Hata',
};

/** @param {string | undefined | null} status */
export function eInvoiceStatusLabel(status) {
  const key = String(status || 'none');
  return E_INVOICE_STATUS_LABELS[key] || key || '—';
}

/** @param {string | undefined | null} status */
export function eInvoiceStatusBadgeClass(status) {
  switch (status) {
    case 'awaiting_integration':
    case 'pending_manual':
      return 'bg-amber-100 text-amber-900 ring-amber-200';
    case 'submitted':
      return 'bg-emerald-100 text-emerald-900 ring-emerald-200';
    case 'failed':
      return 'bg-red-100 text-red-800 ring-red-200';
    default:
      return 'bg-neutral-100 text-neutral-700 ring-neutral-200';
  }
}

/** Ödeme alınmış, faturalandırılabilir sipariş durumları */
export const BILLABLE_ORDER_STATUSES = new Set(['hazirlaniyor', 'kargolandi', 'teslim-edildi']);
