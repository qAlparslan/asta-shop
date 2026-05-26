/**
 * Ürün `skin_type` (slug) ile mağaza cilt filtresindeki kullanıcı etiketi eşlemesi.
 * Liste `SiteSetting.skinFilterOptions` JSON dizisinden gelir — sıra aynı kalır.
 */

/** @typedef {{ slug: string; label: string; enabled: boolean }} SkinCatalogRow */

export const PRODUCT_SKIN_SLUGS = ['hassas', 'kuru', 'yagli_karma', 'olgun'];

const FALLBACK_LABEL = {
  hassas: 'Hassas',
  kuru: 'Kuru',
  yagli_karma: 'Yağlı/Karma',
  olgun: 'Olgun cilt',
};

/** @returns {SkinCatalogRow[]} */
export function defaultSkinCatalogRows() {
  return PRODUCT_SKIN_SLUGS.map((slug) => ({
    slug,
    label: FALLBACK_LABEL[slug] || slug,
    enabled: true,
  }));
}

/** @param {unknown} raw */
export function normalizeSkinCatalogRows(raw) {
  let arr = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = null;
    }
  }
  if (!Array.isArray(arr)) arr = [];

  /** @type {Map<string, SkinCatalogRow>} */
  const bySlug = new Map();

  PRODUCT_SKIN_SLUGS.forEach((slug) => {
    bySlug.set(slug, {
      slug,
      label: FALLBACK_LABEL[slug],
      enabled: true,
    });
  });

  /** @type {string[]} */
  const orderFromFile = [];

  arr.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
    if (!PRODUCT_SKIN_SLUGS.includes(slug)) return;
    if (!orderFromFile.includes(slug)) orderFromFile.push(slug);
    const prev = /** @type {SkinCatalogRow} */ (bySlug.get(slug));
    const labelRaw = typeof row.label === 'string' ? row.label.trim() : '';
    bySlug.set(slug, {
      slug,
      label: labelRaw || prev.label || FALLBACK_LABEL[slug],
      enabled: typeof row.enabled === 'boolean' ? row.enabled : true,
    });
  });

  PRODUCT_SKIN_SLUGS.filter((s) => !orderFromFile.includes(s)).forEach((s) => orderFromFile.push(s));

  return orderFromFile.map((slug) => /** @type {SkinCatalogRow} */ (bySlug.get(slug)));
}

/**
 * @param {SkinCatalogRow[] | unknown} rows
 */
export function enabledSkinFilterChoices(rows) {
  return normalizeSkinCatalogRows(rows).filter((r) => r.enabled);
}

/**
 * @param {string | undefined} skinSlug
 * @param {SkinCatalogRow[] | unknown} rows
 */
export function skinCatalogTagsForSlug(skinSlug, rows) {
  const norm = normalizeSkinCatalogRows(rows);
  const bySlug = new Map(norm.map((r) => [r.slug, r.label]));
  const s = typeof skinSlug === 'string' ? skinSlug.trim() : '';

  if (!s || s === 'tumu') {
    return norm.map((r) => r.label);
  }

  if (!PRODUCT_SKIN_SLUGS.includes(s)) {
    return norm.map((r) => r.label);
  }

  const lab = bySlug.get(s) || FALLBACK_LABEL[s] || s;
  return [lab];
}

/** @param {SkinCatalogRow[]} rows */
export function serializeSkinCatalogRows(rows) {
  const norm = normalizeSkinCatalogRows(rows);
  return JSON.stringify(norm.map(({ slug, label, enabled }) => ({ slug, label, enabled })));
}
