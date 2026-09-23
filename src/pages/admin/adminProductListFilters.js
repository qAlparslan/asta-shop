import { resolveProductPricing } from '../../lib/productPricing.js';

export const ADMIN_PRODUCT_SORT_OPTIONS = [
  { id: 'createdAt_desc', label: 'En yeni eklenen' },
  { id: 'createdAt_asc', label: 'En eski eklenen' },
  { id: 'updatedAt_desc', label: 'Son güncellenen' },
  { id: 'name_asc', label: 'Ad (A → Z)' },
  { id: 'name_desc', label: 'Ad (Z → A)' },
  { id: 'price_asc', label: 'Fiyat (düşük → yüksek)' },
  { id: 'price_desc', label: 'Fiyat (yüksek → düşük)' },
  { id: 'stock_asc', label: 'Stok (az → çok)' },
  { id: 'stock_desc', label: 'Stok (çok → az)' },
  { id: 'discount_desc', label: 'İndirim oranı (yüksek)' },
  { id: 'cart_add_desc', label: 'Sepete ekleme (yüksek)' },
  { id: 'cart_hold_desc', label: 'Aktif sepette (yüksek)' },
];

export const LOW_STOCK_THRESHOLD = 5;

/** @param {unknown} raw */
function parseVariants(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(arr) ? arr : [];
}

/** @param {Record<string, unknown>} p */
export function effectiveProductStock(p) {
  const variants = parseVariants(p.variants);
  if (variants.length) {
    return variants.reduce((s, v) => s + Math.max(0, Number(v?.stock) || 0), 0);
  }
  return Math.max(0, Number(p.stock) || 0);
}

/** @param {Record<string, unknown>} p */
function imagePathCount(p) {
  const raw = p.images;
  if (raw == null) return 0;
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return 0;
    }
  }
  return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()).length : 0;
}

/** @param {Record<string, unknown>} p */
function isScheduledDiscountActiveNow(p, now = new Date()) {
  const pct = parseInt(String(p.discountPercent ?? ''), 10);
  if (!Number.isFinite(pct) || pct < 1) return false;
  if (!p.discountStartsAt) return false;
  const start = new Date(String(p.discountStartsAt));
  if (Number.isNaN(start.getTime()) || start > now) return false;
  if (!p.discountExpiresAt) return true;
  const end = new Date(String(p.discountExpiresAt));
  return !Number.isNaN(end.getTime()) && end > now;
}

/** @param {Record<string, unknown>} p */
function isScheduledDiscountFuture(p, now = new Date()) {
  const pct = parseInt(String(p.discountPercent ?? ''), 10);
  if (!Number.isFinite(pct) || pct < 1 || !p.discountStartsAt) return false;
  const start = new Date(String(p.discountStartsAt));
  return !Number.isNaN(start.getTime()) && start > now;
}

/** @param {Record<string, unknown>} p */
function discountPercentForSort(p) {
  const pricing = resolveProductPricing(p);
  if (pricing.discountPercent != null) return pricing.discountPercent;
  const pct = parseInt(String(p.discountPercent ?? ''), 10);
  return Number.isFinite(pct) ? pct : 0;
}

/** @param {Record<string, unknown>} p @param {string} q */
function matchesSearch(p, q) {
  if (!q) return true;
  const hay = [
    p.name,
    p.brand,
    p.category,
    p.barcode,
    p.slug,
  ]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
  return hay.includes(q);
}

/**
 * @param {Record<string, unknown>} p
 * @param {{
 *   status: string;
 *   stock: string;
 *   discount: string;
 *   category: string;
 *   tag: string;
 *   content: string;
 *   engagement: string;
 * }} filters
 */
export function productMatchesAdminFilters(p, filters) {
  const stock = effectiveProductStock(p);
  const active = p.is_active !== false && p.is_active !== 'false';
  const autoHidden = Boolean(p.autoHiddenOutOfStock);

  switch (filters.status) {
    case 'published':
      if (!active || stock < 1) return false;
      break;
    case 'inactive':
      if (active) return false;
      break;
    case 'auto_hidden':
      if (!autoHidden) return false;
      break;
    case 'out_of_stock':
      if (stock > 0) return false;
      break;
    default:
      break;
  }

  switch (filters.stock) {
    case 'low':
      if (stock > LOW_STOCK_THRESHOLD) return false;
      break;
    case 'zero':
      if (stock !== 0) return false;
      break;
    default:
      break;
  }

  const pricing = resolveProductPricing(p);
  const scheduledActive = isScheduledDiscountActiveNow(p);
  const scheduledFuture = isScheduledDiscountFuture(p);

  switch (filters.discount) {
    case 'on_sale':
      if (!pricing.isOnSale && !scheduledActive) return false;
      break;
    case 'scheduled_active':
      if (!scheduledActive) return false;
      break;
    case 'scheduled_future':
      if (!scheduledFuture) return false;
      break;
    case 'none':
      if (pricing.isOnSale || scheduledActive || scheduledFuture) return false;
      break;
    default:
      break;
  }

  if (filters.category !== 'all') {
    const cat = String(p.category || '').trim();
    if (cat !== filters.category) return false;
  }

  if (filters.tag !== 'all') {
    const tag = String(p.tag || 'yok').trim() || 'yok';
    if (tag !== filters.tag) return false;
  }

  switch (filters.content) {
    case 'no_image':
      if (imagePathCount(p) > 0) return false;
      break;
    case 'missing_seo': {
      const slug = String(p.slug || '').trim();
      const mt = String(p.meta_title || '').trim();
      const md = String(p.meta_description || '').trim();
      if (slug && mt && md) return false;
      break;
    }
    case 'empty_description': {
      const desc = String(p.description || '').replace(/<[^>]+>/g, '').trim();
      if (desc.length > 0) return false;
      break;
    }
    default:
      break;
  }

  switch (filters.engagement) {
    case 'in_cart':
      if ((Number(p.cartActiveHolderCount) || 0) < 1) return false;
      break;
    case 'cart_adds':
      if ((Number(p.cartAddCount) || 0) < 1) return false;
      break;
    default:
      break;
  }

  return true;
}

/** @param {Record<string, unknown>[]} list @param {string} sortKey */
export function sortAdminProductList(list, sortKey) {
  const arr = [...list];
  const cmpStr = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr');
  const cmpNum = (a, b) => (Number(a) || 0) - (Number(b) || 0);
  const cmpDate = (a, b) => new Date(a || 0).getTime() - new Date(b || 0).getTime();

  arr.sort((a, b) => {
    switch (sortKey) {
      case 'createdAt_asc':
        return cmpDate(a.createdAt, b.createdAt);
      case 'updatedAt_desc':
        return cmpDate(b.updatedAt, a.updatedAt);
      case 'name_asc':
        return cmpStr(a.name, b.name);
      case 'name_desc':
        return cmpStr(b.name, a.name);
      case 'price_asc':
        return cmpNum(resolveProductPricing(a).salePrice, resolveProductPricing(b).salePrice);
      case 'price_desc':
        return cmpNum(resolveProductPricing(b).salePrice, resolveProductPricing(a).salePrice);
      case 'stock_asc':
        return cmpNum(effectiveProductStock(a), effectiveProductStock(b));
      case 'stock_desc':
        return cmpNum(effectiveProductStock(b), effectiveProductStock(a));
      case 'discount_desc':
        return cmpNum(discountPercentForSort(b), discountPercentForSort(a));
      case 'cart_add_desc':
        return cmpNum(b.cartAddCount, a.cartAddCount);
      case 'cart_hold_desc':
        return cmpNum(b.cartActiveHolderCount, a.cartActiveHolderCount);
      case 'createdAt_desc':
      default:
        return cmpDate(b.createdAt, a.createdAt);
    }
  });
  return arr;
}

/**
 * @param {Record<string, unknown>[]} products
 * @param {string} query
 * @param {object} filters
 * @param {string} sortKey
 */
export function filterAndSortAdminProducts(products, query, filters, sortKey) {
  const q = String(query || '').trim().toLowerCase();
  let list = products.filter((p) => matchesSearch(p, q) && productMatchesAdminFilters(p, filters));
  list = sortAdminProductList(list, sortKey);
  return list;
}

/** @param {Record<string, unknown>[]} products */
export function uniqueProductCategories(products) {
  const set = new Set();
  for (const p of products) {
    const c = String(p.category || '').trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
}
