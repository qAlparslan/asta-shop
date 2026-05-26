/**
 * `backend/services/orderPricing.js` ile aynı varsayılanlar ve matematik (istemci gösterimi + sipariş tutarı doğrulaması).
 */

function parseBool(v, def = true) {
  if (v === undefined || v === null) return def;
  return String(v) === 'true' || v === true;
}

function parseNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * @param {{ price: number; quantity: number }[]} lines
 * @param {number} discountPercent 0–99
 * @param {Record<string, unknown>} settings `GET /api/settings` yanıtındaki `settings` objesi
 */
export function computeOrderTotals(lines, discountPercent, settings = {}) {
  const subtotal = lines.reduce((s, l) => s + Number(l.price) * l.quantity, 0);
  const dp = Math.min(99, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = subtotal * (dp / 100);
  const afterDisc = subtotal - discountAmount;

  const shippingFeeEnabled = parseBool(settings.shippingFeeEnabled, true);
  const freeShippingEnabled = parseBool(settings.freeShippingEnabled, true);
  const standardShippingFee = parseNum(settings.standardShippingFee, 50);
  const freeShippingThreshold = parseNum(settings.freeShippingThreshold, 500);

  const qualifiesFree =
    freeShippingEnabled && freeShippingThreshold > 0 && afterDisc >= freeShippingThreshold;
  const shipping =
    lines.length === 0 || !shippingFeeEnabled || qualifiesFree ? 0 : standardShippingFee;

  const total = Number((afterDisc + shipping).toFixed(2));

  return {
    subtotal,
    discountPercent: dp,
    discountAmount,
    afterDisc,
    shipping,
    total,
    freeShippingThreshold,
    freeShippingEnabled,
  };
}
