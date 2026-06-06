import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { storefrontProductPath } from '../../lib/productPaths.js';
import { formatTRY } from '../../lib/formatTRY.js';
import { resolveVariantUnitPricing } from '../../lib/productPricing.js';
import DiscountRosetteBadge from '../DiscountRosetteBadge.jsx';
import ProductPriceDisplay from '../ProductPriceDisplay.jsx';
import StarRating from '../StarRating.jsx';

/**
 * Katalog kartı: marka → ad (2 satır) → yıldız → fiyat → sepete ekle
 * @param {{ brand?: string; name?: string; priceLabel?: string; image?: string; product?: Record<string, unknown> | null }} props
 */
export default function CatalogProductCard({ brand, name, priceLabel: _ignored, image, product }) {
  const { addItem } = useCart();
  const variants = useMemo(() => {
    const v = product?.variants;
    return Array.isArray(v) ? v : [];
  }, [product?.variants]);

  const basePricing = useMemo(
    () => ({
      salePrice: Number(product?.price) || 0,
      compareAtPrice: product?.compareAtPrice ?? null,
      discountPercent: product?.discountPercent ?? null,
      isOnSale: Boolean(product?.isOnSale),
    }),
    [product?.price, product?.compareAtPrice, product?.discountPercent, product?.isOnSale],
  );

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
  const unitPricing = useMemo(() => {
    const extra = selected ? selected.priceExtra : 0;
    return resolveVariantUnitPricing(basePricing, extra);
  }, [basePricing, selected]);

  const unitPrice = unitPricing.salePrice;

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
    <article className="flex flex-col rounded-lg border border-neutral-200 bg-white p-3 text-center shadow-sm transition-shadow hover:shadow-card sm:p-4">
      <Link
        to={detailPath}
        className="group block shrink-0 overflow-hidden rounded-md bg-neutral-50 outline-none ring-brand ring-offset-2 focus-visible:ring-2"
      >
        <div className="aspect-square">
          <img
            src={image || ''}
            alt={name || ''}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      <p className="mt-2 truncate text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-[11px]">
        {brand}
      </p>

      <div className="relative mt-1 min-h-[2.5rem] px-0.5">
        <h3 className="line-clamp-2 pr-9 text-sm font-bold leading-5 text-asta-navy sm:pr-10 sm:text-[15px]">
          <Link to={detailPath} className="hover:text-brand">
            {name}
          </Link>
        </h3>
        {unitPricing.isOnSale && unitPricing.discountPercent != null && unitPricing.discountPercent > 0 ? (
          <div className="absolute -right-0.5 top-0 sm:right-0">
            <DiscountRosetteBadge percent={unitPricing.discountPercent} size="sm" />
          </div>
        ) : null}
      </div>

      <div
        className="mt-1 flex h-4 items-center justify-center gap-1"
        aria-label={reviewCount > 0 ? `${averageRating.toFixed(1)} puan, ${reviewCount} yorum` : undefined}
      >
        {reviewCount > 0 ? (
          <>
            <StarRating value={averageRating} size="sm" />
            <span className="text-[11px] text-neutral-500">({reviewCount})</span>
          </>
        ) : null}
      </div>

      {variants.length > 0 ? (
        <div className="mt-2 text-left">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            Seçenek
          </label>
          <select
            value={variantId}
            onChange={(ev) => setVariantId(ev.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-asta-navy outline-none ring-brand ring-offset-1 focus:border-brand/40 focus:ring-2"
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock < 1}>
                {v.name}
                {v.stock < 1 ? ' — stok yok' : v.priceExtra > 0 ? ` (+${formatTRY(v.priceExtra)})` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-2">
        <ProductPriceDisplay pricing={unitPricing} size="sm" align="center" showDiscountBadge={false} />
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        aria-disabled={!canAdd}
        className="mt-2 w-full rounded-md bg-brand py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        Sepete ekle
      </button>
    </article>
  );
}
