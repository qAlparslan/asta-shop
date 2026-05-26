import { mediaUrl } from './mediaUrl.js';
import { normalizeSkinCatalogRows, skinCatalogTagsForSlug } from './skinFilterCatalog.js';
import { parseMoneyTR, resolveVariantPriceExtra } from './parseMoney.js';

/** @param {unknown} raw */
export function galleryPathsFromImages(raw) {
  let arr = raw;
  if (arr == null || arr === '') return [];
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => typeof x === 'string' && String(x).trim())
    .map((x) => mediaUrl(String(x).trim()));
}

/** @param {unknown} images */
export function pickProductImagePath(images) {
  if (images == null) return '';
  let arr = images;
  if (typeof images === 'string') {
    try {
      arr = JSON.parse(images);
    } catch {
      return '';
    }
  }
  if (!Array.isArray(arr)) return '';
  const p = arr.find((x) => typeof x === 'string' && x.trim());
  return typeof p === 'string' ? p.trim() : '';
}

/**
 * Sequelize ürün satırını sepet + katalog kartı için düzleştirir.
 * @param {Record<string, unknown>} p
 * @param {unknown} [skinFilterRowsRaw] Ayarlardan gelen vitrin «cilt tipi» eşlemesi
 */
export function mapApiProductToCatalog(p, skinFilterRowsRaw) {
  const skinRows = normalizeSkinCatalogRows(skinFilterRowsRaw);
  const id = String(p.id || '');
  const imgPath = pickProductImagePath(p.images);
  const image = imgPath ? mediaUrl(imgPath) : '';

  const categoryText = typeof p.category === 'string' && p.category.trim() ? p.category.trim() : '';

  /** Kategori filtresi: yalnızca kayıtlı kategori metni (+ gerekmezse bölgeler kaldırıldı). */
  const categories = [];
  if (categoryText) categories.push(categoryText);

  const purpose = typeof p.purpose === 'string' ? p.purpose : 'diger';
  const area = typeof p.area === 'string' ? p.area : 'genel';
  const skinSlugRaw = typeof p.skin_type === 'string' ? p.skin_type.trim() : '';
  const skinTypes = skinCatalogTagsForSlug(skinSlugRaw || 'tumu', skinRows);
  const baseRaw = parseMoneyTR(p.price);
  const price =
    Number.isFinite(baseRaw) && baseRaw >= 0 ? Number(baseRaw.toFixed(2)) : 0;

  /** @returns {{ id: string; name: string; stock: number; priceExtra: number }[]} */
  const normalizeVariantsCatalog = () => {
    let arr = p.variants;
    if (arr == null || arr === '') return [];
    if (typeof arr === 'string') {
      try {
        arr = JSON.parse(arr);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.id === 'string' && String(x.id).trim())
      .map((x) => ({
        id: String(x.id).trim(),
        name:
          typeof x.name === 'string' && String(x.name).trim()
            ? String(x.name).trim()
            : 'Seçenek',
        stock: Math.max(0, Math.floor(Number(x.stock) || 0)),
        priceExtra: resolveVariantPriceExtra(x, price),
      }));
  };

  const variants = normalizeVariantsCatalog();

  const brand = typeof p.brand === 'string' && p.brand.trim() ? p.brand.trim() : 'ASTA TİCARET';
  const name = typeof p.name === 'string' ? p.name : 'Ürün';
  const slug = typeof p.slug === 'string' && p.slug.trim() ? p.slug.trim() : '';
  const gallery = galleryPathsFromImages(p.images);

  const tagRaw = typeof p.tag === 'string' ? p.tag.trim() : '';

  return {
    id,
    slug,
    brand,
    name,
    price: Number.isFinite(price) ? price : 0,
    image,
    gallery,
    categories,
    skinTypes,
    purpose,
    area,
    variants,
    tag: tagRaw,
  };
}
