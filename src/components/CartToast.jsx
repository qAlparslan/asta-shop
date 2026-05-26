import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { mediaUrl } from '../lib/mediaUrl.js';
import { formatTRY } from '../lib/formatTRY.js';

const VISIBLE_MS = 3500;

export default function CartToast() {
  const { lastAdded, dismissLastAdded, itemCount, subtotal } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAdded) {
      setVisible(false);
      return undefined;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      const t2 = setTimeout(() => dismissLastAdded(), 250);
      return () => clearTimeout(t2);
    }, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [lastAdded, dismissLastAdded]);

  if (!lastAdded) return null;

  const { line } = lastAdded;
  const imgSrc = line.image ? mediaUrl(line.image) : '';

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 sm:bottom-6 sm:right-6 sm:left-auto sm:justify-end sm:px-0`}
      aria-live="polite"
      role="status"
    >
      <div
        className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl ring-1 ring-emerald-50 transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              Sepete eklendi
            </p>
            <div className="mt-1 flex items-center gap-2">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md border border-neutral-100 bg-neutral-50 object-contain p-1"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 text-neutral-400">
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-asta-navy">
                  {line.name}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-neutral-600">
                  {formatTRY(line.price)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-neutral-500">
                Sepet: <span className="font-semibold text-neutral-800">{itemCount} ürün</span>
                {' · '}
                <span className="font-semibold text-neutral-800">{formatTRY(subtotal)}</span>
              </p>
              <Link
                to="/sepet"
                onClick={() => dismissLastAdded()}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
              >
                Sepete git
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissLastAdded()}
            className="-mr-1 -mt-1 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div
          className={`h-1 bg-emerald-500/80 transition-[width] ease-linear ${
            visible ? 'w-full' : 'w-0'
          }`}
          style={{ transitionDuration: visible ? `${VISIBLE_MS}ms` : '250ms' }}
          aria-hidden
        />
      </div>
    </div>
  );
}
