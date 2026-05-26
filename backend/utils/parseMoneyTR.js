/**
 * @param {unknown} raw
 * @returns {number}
 */
function parseMoneyTR(raw) {
    if (raw == null || raw === '') return NaN;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const s0 = String(raw).trim();
    if (!s0) return NaN;
    let s = s0.replace(/\s/g, '');
    if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
        return Number(s.replace(/\./g, '').replace(',', '.'));
    }
    if (/^\d+,\d{1,2}$/.test(s)) {
        return Number(s.replace(',', '.'));
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
}

/**
 * Varyant: `priceExtra` yoksa `price` alanına tam birim fiyat veya sadece ek tutar yazılmış olabilir.
 * @param {Record<string, unknown>} v
 * @param {number} basePrice
 */
function resolveVariantPriceExtra(v, basePrice) {
    const base = Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0;
    const peRaw = v?.priceExtra;
    const peStr = peRaw === undefined || peRaw === null ? '' : String(peRaw).trim();
    if (peStr !== '') {
        const pe = parseMoneyTR(peRaw);
        return Number.isFinite(pe) && pe >= 0 ? Number(pe.toFixed(2)) : 0;
    }

    const alt = parseMoneyTR(v?.price);
    if (!Number.isFinite(alt) || alt < 0) return 0;

    if (base > 0 && alt + 1e-6 >= base) {
        return Math.max(0, Number((alt - base).toFixed(2)));
    }
    return Number(alt.toFixed(2));
}

module.exports = { parseMoneyTR, resolveVariantPriceExtra };
