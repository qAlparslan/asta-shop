/** @type {{ value: string; label: string }[]} */
export const ORDER_STATUSES = [
  { value: 'odeme_bekleniyor', label: 'Ödeme bekleniyor' },
  { value: 'hazirlaniyor', label: 'Hazırlanıyor' },
  { value: 'kargolandi', label: 'Kargoda' },
  { value: 'teslim-edildi', label: 'Teslim edildi' },
  { value: 'iptal-edildi', label: 'İptal edildi' },
];

/** @param {string | undefined} status */
export function orderStatusLabel(status) {
  return ORDER_STATUSES.find((s) => s.value === status)?.label || status || '—';
}
