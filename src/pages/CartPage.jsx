import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Trash2, Minus, Plus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { formatTRY } from '../lib/formatTRY.js';
import { apiFetch, isAbortError } from '../api/client.js';
import { computeOrderTotals } from '../lib/orderTotals.js';
import FreeShippingProgress from '../components/FreeShippingProgress.jsx';

export default function CartPage() {
  const { lines, subtotal, itemCount, removeLine, setQuantity } = useCart();

  const [settings, setSettings] = useState({});

  useEffect(() => {
    const ac = new AbortController();
    apiFetch('/api/settings', { skipAuth: true, signal: ac.signal })
      .then((res) => setSettings(res?.data?.settings || {}))
      .catch((err) => {
        if (!isAbortError(err)) setSettings({});
      });
    return () => ac.abort();
  }, []);

  const totalsPreview = useMemo(
    () => computeOrderTotals(lines, 0, settings),
    [lines, settings],
  );

  const shippingFeeOn = settings.shippingFeeEnabled !== false && settings.shippingFeeEnabled !== 'false';
  const freeOn =
    totalsPreview.freeShippingEnabled !== false && totalsPreview.freeShippingEnabled !== 'false';
  const thresholdNum = Number(totalsPreview.freeShippingThreshold) || 0;
  const hasItems = lines.length > 0;
  const showFreeShippingBanner = hasItems && shippingFeeOn && freeOn && thresholdNum > 0;
  const paysShippingCharge = totalsPreview.shipping > 0;

  return (
    <section className="border-b border-neutral-100 bg-neutral-50/80 py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">Sepetim</h1>
            {hasItems && (
              <p className="mt-2 text-sm text-neutral-600">
                {itemCount} ürün — Ara toplam <span className="font-semibold text-neutral-800">{formatTRY(subtotal)}</span>
              </p>
            )}
          </div>
          <Link
            to="/urunler"
            className="text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            ← Alışverişe devam
          </Link>
        </div>

        {!hasItems ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center shadow-sm sm:py-20">
            <ShoppingBag className="h-16 w-16 text-neutral-200" strokeWidth={1.25} aria-hidden />
            <h2 className="mt-6 text-xl font-bold text-neutral-900">Sepetiniz boş</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm text-neutral-600">
              Ürünleri sepetinize ekleyerek buradan siparişinizi oluşturabilirsiniz.
            </p>
            <Link
              to="/urunler"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
            >
              Ürünleri incele
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
            <div className="space-y-4 lg:col-span-8">
              {showFreeShippingBanner ? (
                <FreeShippingProgress
                  threshold={thresholdNum}
                  qualifiedAmount={totalsPreview.afterDisc}
                  paysShippingCharge={paysShippingCharge}
                  freeShippingEnabled={freeOn}
                  shippingFeeEnabled={shippingFeeOn}
                />
              ) : null}
              <ul className="space-y-4">
                {lines.map((line) => {
                  const lineTotal = line.price * line.quantity;
                  return (
                    <li
                      key={line.lineId}
                      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:p-5"
                    >
                      <Link to="/urunler" className="block shrink-0 self-center sm:self-stretch">
                        <div className="h-24 w-24 overflow-hidden rounded-lg bg-neutral-50 sm:h-28 sm:w-28">
                          <img
                            src={line.image}
                            alt={line.name}
                            className="h-full w-full object-contain p-3"
                          />
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                          {line.brand}
                        </p>
                        <h3 className="mt-1 text-sm font-bold leading-snug text-asta-navy sm:text-[15px]">
                          {line.name}
                        </h3>
                        <p className="mt-2 text-xs text-neutral-500">Birim fiyat — {formatTRY(line.price)}</p>
                      </div>
                      <div className="flex flex-row items-center justify-center gap-4 sm:flex-col sm:gap-3">
                        <div className="flex items-center rounded-md border border-neutral-200 bg-neutral-50 p-1">
                          <button
                            type="button"
                            aria-label="Adet azalt"
                            className="flex h-9 w-9 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-white hover:text-brand"
                            onClick={() => setQuantity(line.lineId, line.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" aria-hidden />
                          </button>
                          <span className="min-w-[2.25rem] text-center text-sm font-semibold tabular-nums text-neutral-900">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Adet artır"
                            className="flex h-9 w-9 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-white hover:text-brand"
                            onClick={() => setQuantity(line.lineId, line.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeLine(line.lineId)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Sil
                        </button>
                      </div>
                      <div className="border-t border-neutral-100 pt-3 text-center sm:border-0 sm:pt-0 sm:text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Satır toplamı</p>
                        <p className="mt-1 text-lg font-bold tabular-nums text-asta-navy">{formatTRY(lineTotal)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <aside className="lg:col-span-4 lg:sticky lg:top-6">
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card">
                <h2 className="text-base font-bold text-neutral-900">Sipariş özeti</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 text-neutral-600">
                    <dt>Ara toplam ({itemCount} ürün)</dt>
                    <dd className="font-semibold tabular-nums text-neutral-900">{formatTRY(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 text-neutral-600">
                    <dt>Kargo</dt>
                    <dd className="text-right font-medium text-neutral-800">Ödeme adımında</dd>
                  </div>
                </dl>
                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <div className="flex justify-between gap-4 text-base font-bold text-neutral-900">
                    <span>Toplam</span>
                    <span className="tabular-nums">{formatTRY(subtotal)}</span>
                  </div>
                </div>
                <Link
                  to="/odeme"
                  className="mt-6 flex w-full items-center justify-center rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
                >
                  Ödemeye geç
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
