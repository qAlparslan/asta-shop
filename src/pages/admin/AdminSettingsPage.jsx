import { Navigate } from 'react-router-dom';

/** @deprecated Tek panel: `/admin/sistem/kategoriler`. */
export default function AdminSettingsPage() {
  return <Navigate to="/admin/sistem/kategoriler" replace />;
}
