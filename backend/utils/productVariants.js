const { randomUUID } = require('crypto');
const { parseMoneyTR, resolveVariantPriceExtra } = require('./parseMoneyTR');

/** Sequelize JSON varyant dizisini parse eder. */
function parseVariants(jsonOrArr) {
    if (jsonOrArr == null || jsonOrArr === '') return [];
    let arr = jsonOrArr;
    if (typeof jsonOrArr === 'string') {
        try {
            arr = JSON.parse(jsonOrArr);
        } catch {
            return [];
        }
    }
    return Array.isArray(arr) ? arr : [];
}

/**
 * DB'ye yazılacak şekilde varyantları normalize eder (sabit id, sayısal alanlar).
 * @param {unknown} rawParsed - JSON.parse sonucu veya dizi
 */
function normalizeVariantsForPersistence(rawParsed) {
    const arr = Array.isArray(rawParsed) ? rawParsed : [];
    return arr.map((v) => {
        const id = v && typeof v.id === 'string' && v.id.trim() ? v.id.trim() : randomUUID();
        const name = String(v?.name ?? '').trim() || 'Seçenek';
        const stock = Math.max(0, Math.floor(Number(v?.stock) || 0));
        const px = Number(v?.priceExtra);
        const extra = Number.isFinite(px) && px >= 0 ? Number(px.toFixed(2)) : undefined;
        const out = { id, name, stock };
        if (extra !== undefined && extra > 0) out.priceExtra = extra;
        return out;
    });
}

/**
 * Sepet satırı için birim fiyat ve görünen ad.
 * Seçenek yoksa variantId yok sayılır; seçenek varsa zorunludur.
 */
function resolveCartLine(product, variantId, qty) {
    const qtyInt = Math.floor(Number(qty) || 0);
    if (qtyInt < 1) {
        const e = new Error('Geçersiz ürün adedi.');
        e.code = 'BAD_QTY';
        throw e;
    }

    const variants = parseVariants(product.variants).filter((v) => v && v.id);
    const baseRaw = parseMoneyTR(product.price);
    const base = Number.isFinite(baseRaw) && baseRaw >= 0 ? Number(baseRaw.toFixed(2)) : NaN;
    if (!Number.isFinite(base) || base < 0) {
        const e = new Error('Ürün fiyatı geçersiz.');
        e.code = 'BAD_PRICE';
        throw e;
    }

    if (variants.length === 0) {
        return {
            unitPrice: Number(base.toFixed(2)),
            displayName: product.name,
            variantId: null,
            variantName: null,
        };
    }

    const vid = variantId != null ? String(variantId).trim() : '';
    if (!vid) {
        const e = new Error('Bu ürün için varyant seçimi zorunludur.');
        e.code = 'VARIANT_REQUIRED';
        throw e;
    }

    const v = variants.find((x) => String(x.id) === vid);
    if (!v) {
        const e = new Error('Sepette geçersiz ürün seçeneği var. Sepeti güncelleyin.');
        e.code = 'BAD_VARIANT';
        throw e;
    }

    const add = resolveVariantPriceExtra(v, base);
    const unit = Number((base + add).toFixed(2));
    const vStock = Math.max(0, Math.floor(Number(v.stock) || 0));
    if (vStock < qtyInt) {
        const e = new Error(`Seçenek için yetersiz stok: ${v.name}`);
        e.code = 'NO_STOCK_VARIANT';
        throw e;
    }

    return {
        unitPrice: unit,
        displayName: `${product.name} (${v.name})`,
        variantId: v.id,
        variantName: v.name,
    };
}

module.exports = {
    parseVariants,
    normalizeVariantsForPersistence,
    resolveCartLine,
};
