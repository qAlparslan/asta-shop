import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { storefrontProductPath } from '../../lib/productPaths.js';
import { formatTRY } from '../../lib/formatTRY.js';
import StarRating from '../StarRating.jsx';

/**
 * Katalog grid kartı — eşit yükseklik; sepete ekle butonu altta hizalı.
 * @param {{ brand?: string; name?: string; priceLabel?: string; image?: string; product?: Record<string, unknown> | null }} props
 */
export default function CatalogProductCard({ brand, name, priceLabel: _ignored, image, product }) {
  const { addItem } = useCart();
  const variants = useMemo(() => {
    const v = product?.variants;
    return Array.isArray(v) ? v : [];
  }, [product?.variants]);

  const basePrice = Number(product?.price) || 0;

  const defaultVariantId = useMemo(() => {
    if (!variants.length) return '';
    const inStock = variants.find((x) => x.stock > 0);
    return (inStock || variants[0]).id;
  }, [variants]);

  const [variantId, setVariantId] = useState(defaultVariantId);

  useEffect(() => {
    setVariantId(defaultVariantId);
  }, [product?.id, defaultVariantId]);

  const selected = variants.find((v) => v.id === variantId);
  const unitPrice = variants.length
    ? basePrice + (selected ? selected.priceExtra : 0)
    : basePrice;

  const canAdd =
    product &&
    (variants.length === 0 ||
      !!(
        selected &&
        selected.stock > 0 &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0
      ));

  const displayName =
    variants.length && selected ? `${product.name} (${selected.name})` : product?.name || name;

  const detailPath = product ? storefrontProductPath(product) : '/urunler';
  const reviewCount = Math.max(0, Number(product?.reviewCount) || 0);
  const averageRating = reviewCount > 0 ? Number(product?.averageRating) || 0 : 0;

  const handleAdd = () => {
    if (!product || typeof product.id !== 'string') return;
    addItem({
      productId: product.id,
      brand: typeof product.brand === 'string' ? product.brand : brand || '',
      name: displayName,
      variantId: variants.length && selected ? selected.id : null,
      variantLabel: variants.length && selected ? selected.name : null,
      price: unitPrice,
      image: typeof product.image === 'string' ? product.image : image || '',
    });
  };

  return (
    <article className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-3 text-center shadow-sm transition-shadow hover:shadow-card sm:p-4">
      <Link
        to={detailPath}
        className="group block shrink-0 text-inherit no-underline outline-none ring-brand ring-offset-2 focus-visible:rounded-md focus-visible:ring-2"
      >
        <div className="mb-3 aspect-square overflow-hidden rounded-md bg-neutral-50">
          <img
            src={image || ''}
            alt={name || ''}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <p className="min-h-[1rem] truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          {brand}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-asta-navy sm:min-h-[2.75rem] sm:text-[15px]">
          {name}
        </h3>
        <div
          className="mt-1 flex min-h-[1.25rem] items-center justify-center gap-1.5"
          aria-label={reviewCount > 0 ? `${averageRating.toFixed(1)} puan, ${reviewCount} yorum` : undefined}
        >
          {reviewCount > 0 ? (
            <>
              <StarRating value={averageRating} size="sm" />
              <span className="text-xs text-neutral-500">({reviewCount})</span>
            </>
          ) : null}
        </div>
      </Link>

      <div className="mt-2 min-h-[4.5rem] text-left">
        {variants.length > 0 ? (
          <>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              Seçenek
            </label>
            <select
              value={variantId}
              onChange={(ev) => setVariantId(ev.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-asta-navy outline-none ring-brand ring-offset-1 focus:border-brand/40 focus:ring-2"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id} disabled={v.stock < 1}>
                  {v.name}
                  {v.stock < 1 ? ' — stok yok' : v.priceExtra > 0 ? ` (+${formatTRY(v.priceExtra)})` : ''}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="mt-auto pt-2">
        <p className="min-h-[1.5rem] text-base font-bold tabular-nums text-asta-navy">
          {formatTRY(unitPrice)}
        </p>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          aria-disabled={!canAdd}
          className="mt-3 w-full rounded-md bg-brand py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
        >
          Sepete ekle
        </button>
      </div>
    </article>
  );
}
