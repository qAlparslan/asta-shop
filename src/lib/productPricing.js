import { parseMoneyTR } from './parseMoney.js';

/**
 * @typedef {{ salePrice: number; compareAtPrice: number | null; discountPercent: number | null; isOnSale: boolean }} ProductPricing
 */

/**
 * @param {Record<string, unknown>} p
 * @returns {ProductPricing}
 */
export function resolveProductPricing(p) {
  const saleRaw = parseMoneyTR(p?.price);
  const origRaw = parseMoneyTR(p?.original_price);

  const salePrice =
    Number.isFinite(saleRaw) && saleRaw >= 0 ? Number(saleRaw.toFixed(2)) : 0;

  const originalPrice =
    Number.isFinite(origRaw) && origRaw > 0 ? Number(origRaw.toFixed(2)) : null;

  const isOnSale = Boolean(originalPrice != null && originalPrice > salePrice + 0.004);

  let discountPercent = null;
  if (isOnSale && originalPrice != null) {
    const stored = Number(p?.discountPercent);
    const computed = Math.round(((originalPrice - salePrice) / originalPrice) * 100);
    discountPercent =
      Number.isFinite(stored) && stored > 0 && stored <= 99 ? stored : computed;
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
      discountPercent = computed > 0 ? computed : null;
    }
  }

  return {
    salePrice,
    compareAtPrice: isOnSale ? originalPrice : null,
    discountPercent: isOnSale ? discountPercent : null,
    isOnSale,
  };
}

/**
 * Varyant ek ücretiyle fiyat (indirim oranı aynı kalır).
 * @param {ProductPricing} base
 * @param {number} [priceExtra]
 * @returns {ProductPricing}
 */
export function resolveVariantUnitPricing(base, priceExtra = 0) {
  const extra = Number.isFinite(Number(priceExtra)) ? Number(priceExtra) : 0;
  if (!base.isOnSale || base.compareAtPrice == null) {
    return {
      salePrice: Number((base.salePrice + extra).toFixed(2)),
      compareAtPrice: null,
      discountPercent: null,
      isOnSale: false,
    };
  }
  const compareAt = Number((base.compareAtPrice + extra).toFixed(2));
  const sale = Number((base.salePrice + extra).toFixed(2));
  return {
    salePrice: sale,
    compareAtPrice: compareAt,
    discountPercent: base.discountPercent,
    isOnSale: true,
  };
}
