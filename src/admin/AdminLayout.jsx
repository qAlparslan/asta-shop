import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TicketPercent,
  SlidersHorizontal,
  ChevronDown,
  Users,
  LogOut,
  Store,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { SYSTEM_SECTIONS } from '../pages/admin/systemSectionConfig.js';

const subLinkBase =
  'block rounded-lg py-1.5 pl-3 pr-2 text-[13px] font-medium leading-snug transition-colors';
const subLinkIdle = 'text-neutral-300 hover:bg-white/10 hover:text-white';
const subLinkActive = 'bg-white/15 text-white';
const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
const linkIdle = 'text-neutral-300 hover:bg-white/10 hover:text-white';
const linkActive = 'bg-brand text-white shadow-sm';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [systemOpen, setSystemOpen] = useState(() =>
    location.pathname.startsWith('/admin/sistem'),
  );

  const systemRouteActive = location.pathname.startsWith('/admin/sistem');

  useEffect(() => {
    if (systemRouteActive) setSystemOpen(true);
  }, [systemRouteActive]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-neutral-100 font-sans text-neutral-900">
      <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-white/10 bg-asta-navy text-white">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-muted">Yönetim</p>
          <p className="mt-1 text-lg font-semibold">Asta Ticaret</p>
          <p className="mt-2 truncate text-xs text-neutral-400">{user?.email}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Özet
          </NavLink>
          <NavLink
            to="/admin/siparisler"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Siparişler
          </NavLink>
          <NavLink
            to="/admin/urunler"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <Package className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Ürünler
          </NavLink>
          <NavLink
            to="/admin/kuponlar"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <TicketPercent className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Kuponlar
          </NavLink>
          <NavLink
            to="/admin/kullanicilar"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <Users className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Kullanıcılar
          </NavLink>
          <div className="flex flex-col gap-0">
            <button
              type="button"
              onClick={() => setSystemOpen((o) => !o)}
              className={`${linkBase} w-full justify-between ${systemRouteActive ? linkActive : linkIdle}`}
              aria-expanded={systemOpen}
            >
              <span className="flex min-w-0 items-center gap-3">
                <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Sistem</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 opacity-90 transition-transform ${systemOpen ? '-rotate-180' : ''}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
            {systemOpen ? (
              <div className="mt-1 space-y-0.5 border-l border-white/20 py-1 pl-3 ml-7">
                {SYSTEM_SECTIONS.map((sec) => (
                  <NavLink
                    key={sec.id}
                    to={`/admin/sistem/${sec.id}`}
                    className={({ isActive }) =>
                      `${subLinkBase} ${isActive ? subLinkActive : subLinkIdle}`
                    }
                  >
                    {sec.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="border-t border-white/10 p-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkBase} ${linkIdle}`}
          >
            <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Mağazayı aç
          </a>
          <button type="button" onClick={handleLogout} className={`${linkBase} w-full ${linkIdle}`}>
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Çıkış
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <Store className="h-8 w-8 text-brand" strokeWidth={1.25} aria-hidden />
            <div>
              <h1 className="text-lg font-bold text-asta-navy">Yönetici paneli</h1>
              <p className="text-xs text-neutral-500">Sipariş, ürün ve sistem ayarları</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
