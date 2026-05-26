/**
 * Cilt bakımı ve genel ürünler için KDV oranı çözümü.
 * 1) Ürün kaydındaki `vatRate` (DB)
 * 2) PARASUT_VAT_BY_PURPOSE JSON (env ile override)
 * 3) Varsayılan purpose haritası
 * 4) PARASUT_DEFAULT_VAT_RATE
 */

const DEFAULT_PURPOSE_VAT = {
    temizleyici: 10,
    nemlendirici: 20,
    'anti-aging': 20,
    onarici: 20,
    diger: 20,
};

let cachedPurposeMap = null;

function getPurposeVatMap() {
    if (cachedPurposeMap) return cachedPurposeMap;
    const def = Number(process.env.PARASUT_DEFAULT_VAT_RATE || 20);
    const base = { ...DEFAULT_PURPOSE_VAT };
    for (const k of Object.keys(base)) {
        if (base[k] == null) base[k] = def;
    }
    const raw = (process.env.PARASUT_VAT_BY_PURPOSE || '').trim();
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                cachedPurposeMap = { ...base, ...parsed };
                return cachedPurposeMap;
            }
        } catch {
            /* yok say */
        }
    }
    cachedPurposeMap = base;
    return cachedPurposeMap;
}

/**
 * @param {import('../models/Product') | null | undefined} product
 */
function resolveVatPercentForProduct(product) {
    if (product?.vatRate != null && product.vatRate !== '') {
        const n = Number(product.vatRate);
        if (!Number.isNaN(n) && n >= 0 && n <= 100) return n;
    }
    const purpose = product?.purpose || 'diger';
    const map = getPurposeVatMap();
    if (map[purpose] != null) return Number(map[purpose]);
    return Number(process.env.PARASUT_DEFAULT_VAT_RATE || 20);
}

module.exports = { resolveVatPercentForProduct, getPurposeVatMap };
