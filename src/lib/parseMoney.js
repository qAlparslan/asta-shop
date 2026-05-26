/**
 * API / form kaynaklı fiyat stringlerini güvenli sayıya çevirir.
 * TR: "150,00" veya "1.234,56" — US: "150.00"
 */

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parseMoneyTR(raw) {
  if (raw == null || raw === '') return NaN;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s0 = String(raw).trim();
  if (!s0) return NaN;

  // Sequelize / MySQL bazen DECIMAL'ı string "150.00" olarak verir — Number doğrudan işler
  let s = s0.replace(/\s/g, '');
  // 1.234,56 (TR binlik + ondalık)
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  // 150,50
  if (/^\d+,\d{1,2}$/.test(s)) {
    return Number(s.replace(',', '.'));
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {unknown} raw
 * @param {number} fallback
 */
export function parseMoneyOr(raw, fallback) {
  const n = parseMoneyTR(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Varyant: `priceExtra` yoksa `price` tam birim fiyat veya yalnızca ek tutar olabilir.
 * @param {Record<string, unknown>} v
 * @param {number} basePrice
 * @returns {number}
 */
export function resolveVariantPriceExtra(v, basePrice) {
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
