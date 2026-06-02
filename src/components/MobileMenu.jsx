import { Link, NavLink } from 'react-router-dom';
import { X, User, LogOut, ShieldCheck } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Ana Sayfa', end: true },
  { to: '/urunler', label: 'Ürünler' },
  { to: '/hakkimizda', label: 'Hakkımızda' },
  { to: '/iletisim', label: 'İletişim' },
];

function itemClass({ isActive }) {
  return `block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
    isActive ? 'bg-asta-maroon text-white' : 'text-neutral-800 hover:bg-neutral-100'
  }`;
}

/**
 * Mobil / tablet için soldan açılan navigasyon çekmecesi.
 * @param {{ open: boolean; onClose: () => void; user: any; displayName: string; onLogout: () => void }} props
 */
export default function MobileMenu({ open, onClose, user, displayName, onLogout }) {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Site menüsü"
        className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
          <span className="leading-tight">
            <span className="block text-xl font-bold tracking-tight text-asta-navy">ASTA</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-asta-maroon">
              Ticaret
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="-mr-1 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-asta-maroon"
          >
            <X className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>

        {user ? (
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-asta-maroon/10 text-asta-maroon">
              <User className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-neutral-900">
                Merhaba, {displayName}
              </span>
              <Link
                to="/hesabim"
                onClick={onClose}
                className="text-xs font-medium text-asta-maroon hover:underline"
              >
                Hesabımı görüntüle
              </Link>
            </span>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Mobil ana menü">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={onClose} className={itemClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-neutral-200 p-3">
          {user ? (
            <>
              <Link
                to="/hesabim"
                onClick={onClose}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Hesabım
              </Link>
              <Link
                to="/hesabim/siparisler"
                onClick={onClose}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Siparişlerim
              </Link>
              {user.role === 'admin' ? (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  <ShieldCheck className="h-4 w-4 text-asta-navy" strokeWidth={1.75} />
                  Yönetim paneli
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Çıkış yap
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                to="/giris?redirect=/hesabim"
                onClick={onClose}
                className="flex-1 rounded-lg border border-asta-maroon px-4 py-2.5 text-center text-sm font-semibold text-asta-maroon hover:bg-asta-maroon/5"
              >
                Giriş Yap
              </Link>
              <Link
                to="/uye-ol"
                onClick={onClose}
                className="flex-1 rounded-lg bg-asta-maroon px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-asta-maroon-hover"
              >
                Üye Ol
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
