import { Link, NavLink } from 'react-router-dom';
import { User, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatTRY } from '../lib/formatTRY.js';

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
  const displayName =
    user?.fullName?.trim()?.split(/\s+/)[0] || user?.email?.split('@')[0] || '';

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-5">
        <Link to="/" className={`${focusRing} shrink-0 rounded-sm lg:min-w-[140px]`}>
          <span className="block text-2xl font-bold leading-[0.95] tracking-tight text-asta-navy sm:text-[1.65rem]">
            ASTA
          </span>
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.32em] text-asta-maroon sm:text-xs">
            TİCARET
          </span>
        </Link>

        <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />

        <div className="flex shrink-0 items-start justify-between gap-6 sm:justify-end lg:gap-10">
          <div className="group flex items-start gap-2.5 rounded-sm">
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

          <Link
            to="/sepet"
            className={`group ${focusRing} relative flex items-start gap-2.5 rounded-sm`}
          >
            <span className="relative mt-0.5 inline-flex shrink-0">
              <ShoppingBag
                className="h-6 w-6 text-asta-icon transition-colors group-hover:text-asta-maroon"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="absolute -right-2 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-asta-maroon px-1 text-[9px] font-bold tabular-nums text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            </span>
            <span className="leading-tight">
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

      <nav aria-label="Ana menü" className="border-t border-neutral-200 bg-white">
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
    </header>
  );
}
