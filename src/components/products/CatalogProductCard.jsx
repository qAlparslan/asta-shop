import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { storefrontProductPath } from '../../lib/productPaths.js';
import { formatTRY } from '../../lib/formatTRY.js';

/**
 * Katalog grid kartı — product verildiğinde Sepete ekler (isteğe bağlı seçenek + fiyat).
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
    <article className="flex flex-col rounded-lg border border-neutral-200 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-card">
      <Link
        to={detailPath}
        className="group block text-inherit no-underline outline-none ring-brand ring-offset-2 focus-visible:rounded-md focus-visible:ring-2"
      >
        <div className="mb-4 aspect-square overflow-hidden rounded-md bg-neutral-50">
          <img
            src={image || ''}
            alt={name || ''}
            className="h-full w-full object-contain p-4 transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{brand}</p>
        <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-snug text-asta-navy sm:text-[15px]">
          {name}
        </h3>
      </Link>
      {variants.length > 0 && (
        <div className="mt-3 text-left">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-neutral-500">Seçenek</label>
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
        </div>
      )}
      <p className={`mt-3 text-base font-bold tabular-nums text-asta-navy ${variants.length ? 'min-h-[1.75rem]' : ''}`}>
        {formatTRY(unitPrice)}
      </p>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!canAdd}
        aria-disabled={!canAdd}
        className="mt-4 w-full rounded-md bg-brand py-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        Sepete ekle
      </button>
    </article>
  );
}
