import { formatTRY } from '../lib/formatTRY.js';

/**
 * @param {{ pricing: { salePrice: number; compareAtPrice?: number | null; discountPercent?: number | null; isOnSale?: boolean }; size?: 'sm' | 'md' | 'lg'; align?: 'left' | 'center'; showDiscountBadge?: boolean }} props
 */
export default function ProductPriceDisplay({
  pricing,
  size = 'md',
  align = 'center',
  showDiscountBadge = true,
}) {
  const alignClass = align === 'left' ? 'justify-start' : 'justify-center';
  const saleClass =
    size === 'lg'
      ? 'text-xl font-bold sm:text-2xl'
      : size === 'sm'
        ? 'text-sm font-bold'
        : 'text-base font-bold';

  if (!pricing?.isOnSale || pricing.compareAtPrice == null) {
    return (
      <p className={`tabular-nums text-asta-navy ${saleClass} ${align === 'left' ? 'text-left' : 'text-center'}`}>
        {formatTRY(pricing?.salePrice ?? 0)}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${alignClass}`}>
      <span className={`tabular-nums text-neutral-400 line-through ${size === 'lg' ? 'text-base sm:text-lg' : 'text-sm'}`}>
        {formatTRY(pricing.compareAtPrice)}
      </span>
      <span className={`tabular-nums text-brand ${saleClass}`}>{formatTRY(pricing.salePrice)}</span>
      {showDiscountBadge && pricing.discountPercent != null && pricing.discountPercent > 0 ? (
        <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand sm:text-xs">
          %{pricing.discountPercent}
        </span>
      ) : null}
    </div>
  );
}
