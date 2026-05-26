import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Package, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const tabBase =
  'inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors sm:flex-initial sm:px-6';
const tabIdle = 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50';
const tabActive = 'border-asta-maroon bg-asta-maroon text-white hover:bg-asta-maroon-hover';

export default function AccountLayout() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">Yükleniyor…</div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname || '/hesabim');
    return <Navigate to={`/giris?redirect=${redirect}`} replace />;
  }

  const isOrders = location.pathname.startsWith('/hesabim/siparisler');

  return (
    <>
      <section className="border-b border-neutral-200 bg-neutral-50/80 pb-8 pt-12 sm:pb-10 sm:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            {isOrders ? 'Siparişlerim' : 'Hesabım'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            {isOrders
              ? 'Tamamladığınız siparişleri ve durumlarını buradan görüntüleyebilirsiniz.'
              : 'Profiliniz, güvenlik ve siparişleriniz için hesap ayarları.'}
          </p>

          <nav className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:mx-auto sm:flex-row sm:justify-center" aria-label="Hesap bölümleri">
            <NavLink end to="/hesabim" className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}>
              <UserCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Hesap bilgileri
            </NavLink>
            <NavLink to="/hesabim/siparisler" className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabIdle}`}>
              <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Siparişlerim
            </NavLink>
          </nav>
        </div>
      </section>

      <Outlet />
    </>
  );
}
