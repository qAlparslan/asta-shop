import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { User, ShoppingBag, Menu } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { assetUrl } from '../config/api.js';
import { formatTRY } from '../lib/formatTRY.js';
import MobileMenu from './MobileMenu.jsx';

const focusRing =
  'outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-asta-maroon/35';

function navItemClass({ isActive }) {
  const base = `${focusRing} inline-flex items-center rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors`;
  return isActive
    ? `${base} bg-asta-maroon text-white hover:bg-asta-maroon-hover`
    : `${base} text-black hover:text-asta-maroon`;
}

const subLinkFocus =
  `${focusRing} rounded-sm text-[11px] font-normal text-neutral-500 underline-offset-2 transition-colors hover:text-asta-maroon focus-visible:underline`;

export default function SiteHeader() {
  const { itemCount, subtotal } = useCart();
  const { user, logout } = useAuth();
  const settings = useSiteSettings();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const logoUrlRaw = typeof settings?.logoUrl === 'string' ? settings.logoUrl.trim() : '';
  const logoSrc = logoUrlRaw ? assetUrl(logoUrlRaw) : '';
  const storeName =
    typeof settings?.storeName === 'string' && settings.storeName.trim()
      ? settings.storeName.trim()
      : 'Asta Ticaret';
  const displayName =
    user?.fullName?.trim()?.split(/\s+/)[0] || user?.email?.split('@')[0] || '';

  // Rota değişince çekmeceyi kapat; açıkken arka plan kaymasını engelle.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const cartBadge = (
    <span className="absolute -right-2 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-asta-maroon px-1 text-[9px] font-bold tabular-nums text-white">
      {itemCount > 99 ? '99+' : itemCount}
    </span>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:gap-8 lg:px-8 lg:py-5">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menüyü aç"
          className={`${focusRing} -ml-1 rounded-lg p-2 text-asta-navy hover:bg-neutral-100 lg:hidden`}
        >
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>

        <Link
          to="/"
          className={`${focusRing} flex shrink-0 items-center gap-2.5 rounded-sm sm:gap-3 lg:min-w-[140px]`}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={storeName}
              className="h-9 w-auto max-w-[110px] shrink-0 object-contain sm:h-11 sm:max-w-[150px] lg:h-12"
            />
          ) : null}
          <span className="block">
            <span className="block text-xl font-bold leading-[0.95] tracking-tight text-asta-navy sm:text-2xl lg:text-[1.65rem]">
              ASTA
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.28em] text-asta-maroon sm:text-[11px] sm:tracking-[0.32em] lg:text-xs">
              TİCARET
            </span>
          </span>
        </Link>

        <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-5 lg:gap-10">
          {/* Hesap — masaüstünde ayrıntılı blok */}
          <div className="group hidden items-start gap-2.5 rounded-sm lg:flex">
            <User
              className="mt-0.5 h-6 w-6 shrink-0 text-asta-icon transition-colors group-hover:text-asta-maroon"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="leading-tight">
              {user ? (
                <>
                  <span className={`${focusRing} block text-sm font-bold text-black`}>
                    Merhaba, {displayName}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-normal text-neutral-500">
                    <Link to="/hesabim" className={subLinkFocus}>
                      Hesabım
                    </Link>
                    <span className="pointer-events-none text-neutral-400" aria-hidden>
                      ·
                    </span>
                    <Link to="/hesabim/siparisler" className={subLinkFocus}>
                      Siparişlerim
                    </Link>
                    <span className="pointer-events-none text-neutral-400" aria-hidden>
                      ·
                    </span>
                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin" className={subLinkFocus}>
                          Yönetim
                        </Link>
                        <span className="pointer-events-none text-neutral-400" aria-hidden>
                          ·
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => logout()}
                      className={`${subLinkFocus} cursor-pointer bg-transparent`}
                    >
                      Çıkış
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <Link
                    to="/giris?redirect=/hesabim"
                    className={`${focusRing} block text-sm font-bold text-black transition-colors hover:text-asta-maroon`}
                  >
                    Hesabım
                  </Link>
                  <span className="mt-0.5 block text-[11px] font-normal text-neutral-500">
                    <Link to="/giris" className={subLinkFocus}>
                      Giriş Yap
                    </Link>
                    <span className="pointer-events-none" aria-hidden>
                      {' '}
                      /{' '}
                    </span>
                    <Link to="/uye-ol" className={subLinkFocus}>
                      Üye Ol
                    </Link>
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Hesap — mobil/tablet sadece ikon */}
          <Link
            to={user ? '/hesabim' : '/giris?redirect=/hesabim'}
            aria-label={user ? 'Hesabım' : 'Giriş yap'}
            className={`${focusRing} rounded-lg p-1.5 text-asta-icon transition-colors hover:text-asta-maroon lg:hidden`}
          >
            <User className="h-6 w-6" strokeWidth={1.75} />
          </Link>

          <Link
            to="/sepet"
            aria-label="Sepetim"
            className={`group ${focusRing} relative flex items-center gap-2.5 rounded-sm`}
          >
            <span className="relative inline-flex shrink-0">
              <ShoppingBag
                className="h-6 w-6 text-asta-icon transition-colors group-hover:text-asta-maroon"
                strokeWidth={1.75}
                aria-hidden
              />
              {cartBadge}
            </span>
            <span className="hidden leading-tight lg:block">
              <span className="block text-sm font-bold text-black transition-colors group-hover:text-asta-maroon">
                Sepetim
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-neutral-600">
                {formatTRY(subtotal)}
              </span>
            </span>
          </Link>
        </div>
      </div>

      <nav aria-label="Ana menü" className="hidden border-t border-neutral-200 bg-white lg:block">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
          <NavLink to="/" end className={navItemClass}>
            ANA SAYFA
          </NavLink>
          <NavLink to="/urunler" className={navItemClass}>
            ÜRÜNLER
          </NavLink>
          <NavLink to="/hakkimizda" className={navItemClass}>
            HAKKIMIZDA
          </NavLink>
          <NavLink to="/iletisim" className={navItemClass}>
            İLETİŞİM
          </NavLink>
        </div>
      </nav>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        displayName={displayName}
        onLogout={logout}
      />
    </header>
  );
}
