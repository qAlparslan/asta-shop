import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Truck } from 'lucide-react';
import { apiFetch } from '../api/client.js';
import { mapApiProductToCatalog } from '../lib/productMap.js';
import { formatTRY } from '../lib/formatTRY.js';
import { resolveProductPricing, resolveVariantUnitPricing } from '../lib/productPricing.js';
import ProductPriceDisplay from '../components/ProductPriceDisplay.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import StarRating from '../components/StarRating.jsx';
import ProductReviewsSection from '../components/products/ProductReviewsSection.jsx';

const ACCENT = '#7d7d62';
const BTN_BG = '#0f172a';

export default function ProductDetailPage() {
  const { slug, productId } = useParams();
  const { addItem } = useCart();
  const site = useSiteSettings();
  const storeLabel = String(site.storeName || '').trim() || '';

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const catalog = useMemo(() => (raw ? mapApiProductToCatalog(raw) : null), [raw]);

  const detailUrl = productId
    ? `/api/products/id/${encodeURIComponent(productId)}`
    : slug
      ? `/api/products/slug/${encodeURIComponent(slug)}`
      : '';

  useEffect(() => {
    if (!detailUrl) {
      setLoading(false);
      setErr('');
      setRaw(null);
      return undefined;
    }
    const ac = new AbortController();
    setLoading(true);
    setErr('');
    apiFetch(detailUrl, { skipAuth: true, signal: ac.signal })
      .then((res) => {
        const p = res?.data?.product;
        if (!p || typeof p !== 'object') throw new Error('Ürün yüklenemedi.');
        setRaw(p);
      })
      .catch((e) => {
        if (e.name !== 'AbortError')
          setErr(e.message || 'Ürün bulunamadı veya bir hata oluştu.');
        setRaw(null);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [detailUrl]);

  useEffect(() => {
    if (!catalog?.name) return undefined;
    const prev = document.title;
    const suffix = storeLabel ? ` - ${storeLabel}` : '';
    document.title = `${catalog.name}${suffix}`;
    return () => {
      document.title = prev;
    };
  }, [catalog?.name, storeLabel]);

  const variants = catalog?.variants ?? [];

  const basePricing = useMemo(() => {
    if (!catalog) {
      return { salePrice: 0, compareAtPrice: null, discountPercent: null, isOnSale: false };
    }
    if (catalog.isOnSale != null) {
      return {
        salePrice: catalog.price ?? 0,
        compareAtPrice: catalog.compareAtPrice ?? null,
        discountPercent: catalog.discountPercent ?? null,
        isOnSale: Boolean(catalog.isOnSale),
      };
    }
    return resolveProductPricing(raw ?? {});
  }, [catalog, raw]);

  const defaultVariantId = useMemo(() => {
    if (!variants.length) return '';
    const ok = variants.find((x) => x.stock > 0);
    return (ok || variants[0]).id;
  }, [variants]);

  const [variantId, setVariantId] = useState(defaultVariantId);
  useEffect(() => setVariantId(defaultVariantId), [catalog?.id, defaultVariantId]);

  const selected = variants.find((v) => v.id === variantId);
  const unitPricing = useMemo(() => {
    const extra = selected ? selected.priceExtra : 0;
    return resolveVariantUnitPricing(basePricing, extra);
  }, [basePricing, selected]);

  const unitPrice = unitPricing.salePrice;

  const canAdd =
    catalog &&
    (variants.length === 0 ||
      !!(selected && selected.stock > 0 && Number.isFinite(unitPrice) && unitPrice >= 0));

  const gallery = catalog?.gallery?.length ? catalog.gallery : catalog?.image ? [catalog.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const [detailTab, setDetailTab] = useState('description');
  useEffect(() => setImgIdx(0), [catalog?.id]);
  useEffect(() => setDetailTab('description'), [catalog?.id]);

  const mainImg = gallery[imgIdx] || '';

  const displayName =
    variants.length && selected
      ? `${catalog.name} (${selected.name})`
      : catalog?.name || '';

  const handleAdd = () => {
    if (!catalog) return;
    addItem({
      productId: catalog.id,
      brand: catalog.brand,
      name: displayName,
      variantId: variants.length && selected ? selected.id : null,
      variantLabel: variants.length && selected ? selected.name : null,
      price: unitPrice,
      image: catalog.image || mainImg || '',
    });
  };

  const categoryPill =
    catalog?.categories?.[0]?.trim()?.toUpperCase() || 'ÜRÜN';

  const descHtml =
    typeof raw?.description === 'string' && raw.description.trim() ? raw.description.trim() : '';

  if (!productId && !slug) {
    return (
      <main className="bg-white px-4 py-16 text-center font-sans text-sm text-neutral-600">
        Geçersiz ürün adresi.{' '}
        <Link to="/urunler" className="font-semibold text-brand hover:underline">
          Ürünlere dön
        </Link>
      </main>
    );
  }

  if (!loading && err) {
    return (
      <main className="bg-white px-4 py-16 text-center font-sans text-sm text-neutral-600">
        <p>{err}</p>
        <Link to="/urunler" className="mt-4 inline-block font-semibold text-brand hover:underline">
          Ürünlere dön
        </Link>
      </main>
    );
  }
  return (
    <main className="border-b border-neutral-100 bg-white font-sans text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <nav className="mb-8 text-sm text-neutral-500">
          <Link to="/" className="hover:text-asta-navy">
            Ana sayfa
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <Link to="/urunler" className="hover:text-asta-navy">
            Ürünler
          </Link>
        </nav>

        {loading ? (
          <p className="text-center text-sm text-neutral-500">Ürün yükleniyor…</p>
        ) : !catalog ? null : (
          <>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)] lg:gap-14">
            <div>
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50">
                {mainImg ? (
                  <img
                    src={mainImg}
                    alt={catalog.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-neutral-400">Görsel yok</span>
                )}
              </div>
              {gallery.length > 1 ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {gallery.map((u, i) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setImgIdx(i)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-white p-2 transition ${
                        i === imgIdx ? 'border-asta-navy ring-2 ring-asta-navy/20' : 'border-neutral-200'
                      }`}
                    >
                      <img src={u} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="lg:pt-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-600">
                  {categoryPill}
                </span>
              </div>

              <p
                className="mt-5 text-sm font-medium uppercase tracking-[0.14em]"
                style={{ color: ACCENT }}
              >
                {catalog.brand}
              </p>

              <h1 className="mt-2 text-balance text-2xl font-bold leading-tight text-[#1a1a1a] sm:text-3xl lg:text-[2rem]">
                {catalog.name}
              </h1>

              {catalog.reviewCount > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StarRating value={catalog.averageRating} size="md" />
                  <span className="text-sm font-semibold text-neutral-700">
                    {Number(catalog.averageRating).toFixed(1)}
                  </span>
                  <span className="text-sm text-neutral-500">({catalog.reviewCount} yorum)</span>
                </div>
              ) : null}

              <div className="mt-5">
                <ProductPriceDisplay pricing={unitPricing} size="lg" align="left" />
              </div>

              {variants.length > 0 ? (
                <div className="mt-6">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Seçenek
                  </label>
                  <select
                    value={variantId}
                    onChange={(ev) => setVariantId(ev.target.value)}
                    className="mt-2 w-full max-w-md rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-asta-navy outline-none ring-brand focus:border-brand/40 focus:ring-2"
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock < 1}>
                        {v.name}
                        {v.stock < 1
                          ? ' — stok yok'
                          : v.priceExtra > 0
                            ? ` (+${formatTRY(v.priceExtra)})`
                            : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <hr className="my-8 border-neutral-100" />

              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="flex w-full max-w-md items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                style={{ backgroundColor: BTN_BG }}
              >
                <ShoppingCart className="h-5 w-5" strokeWidth={2} aria-hidden />
                Sepete ekle
              </button>

              {!canAdd ? (
                <p className="mt-3 max-w-md text-xs text-neutral-500">
                  Şu anda bu seçenek veya ürün sepete eklenemez (stok / fiyat kontrolü).
                </p>
              ) : null}

              <div
                className="mt-12 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-10 text-center text-[10px] font-bold uppercase leading-snug tracking-wide sm:gap-6 sm:text-[11px]"
                style={{ color: ACCENT }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Truck className="h-7 w-7 opacity-90" strokeWidth={1.5} aria-hidden />
                  <span>Hızlı kargo</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ShieldCheck className="h-7 w-7 opacity-90" strokeWidth={1.5} aria-hidden />
                  <span>Orijinal ürün</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full border-t border-neutral-100 pt-8 lg:mt-12">
            <div className="flex gap-1 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setDetailTab('description')}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition sm:px-6 ${
                  detailTab === 'description'
                    ? 'border border-b-0 border-neutral-200 bg-white text-asta-navy'
                    : 'text-neutral-500 hover:text-asta-navy'
                }`}
              >
                Ürün açıklaması
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('reviews')}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition sm:px-6 ${
                  detailTab === 'reviews'
                    ? 'border border-b-0 border-neutral-200 bg-white text-asta-navy'
                    : 'text-neutral-500 hover:text-asta-navy'
                }`}
              >
                Yorumlar
                {catalog.reviewCount > 0 ? ` (${catalog.reviewCount})` : ''}
              </button>
            </div>

            <div className="w-full rounded-b-xl border border-t-0 border-neutral-200 bg-white p-4 sm:p-6 lg:p-8">
              {detailTab === 'description' ? (
                descHtml ? (
                  <div
                    className="product-detail-html w-full max-w-none text-sm leading-relaxed text-neutral-700 [&_a]:text-brand [&_a]:underline [&_b]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-asta-navy [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-asta-navy [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-asta-navy [&_i]:italic [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-neutral-500 [&_p+p]:mt-4 [&_s]:line-through [&_strong]:font-semibold [&_u]:underline [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-neutral-500"
                    dangerouslySetInnerHTML={{ __html: descHtml }}
                  />
                ) : (
                  <p className="text-sm text-neutral-500">
                    Bu ürün için ayrıntılı açıklama henüz eklenmemiş.
                  </p>
                )
              ) : (
                <ProductReviewsSection
                  productId={catalog.id}
                  initialStats={{
                    reviewCount: catalog.reviewCount,
                    averageRating: catalog.averageRating,
                  }}
                />
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </main>
  );
}
