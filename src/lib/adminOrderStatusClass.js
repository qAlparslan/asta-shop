/** Admin tablolarında sipariş durumu rozeti — açık/koyu mod uyumlu. */
export function adminOrderStatusClass(status) {
  switch (status) {
    case 'hazirlaniyor':
      return 'admin-status admin-status-sky ring-1 ring-inset';
    case 'kargolandi':
      return 'admin-status admin-status-indigo ring-1 ring-inset';
    case 'teslim-edildi':
      return 'admin-status admin-status-emerald ring-1 ring-inset';
    case 'iptal-edildi':
      return 'admin-status admin-status-rose ring-1 ring-inset';
    case 'odeme_bekleniyor':
      return 'admin-status admin-status-amber ring-1 ring-inset';
    default:
      return 'admin-status admin-status-neutral ring-1 ring-inset';
  }
}
