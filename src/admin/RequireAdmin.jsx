import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-asta-navy text-white">
        <p className="text-sm font-medium tracking-wide">Yükleniyor…</p>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/giris?redirect=${redirect}`} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">ASTA YÖNETİM</p>
        <h1 className="mt-4 text-2xl font-bold text-asta-navy">Bu alan yöneticilere özeldir</h1>
        <p className="mt-2 max-w-md text-sm text-neutral-600">
          Hesabınız mağaza yöneticisi olarak tanımlı değil. Ana siteden alışverişe devam edebilirsiniz.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  return children;
}
