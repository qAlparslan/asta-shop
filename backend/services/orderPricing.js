const SiteSetting = require('../models/SiteSetting');
const Coupon = require('../models/Coupon');

async function loadSettingsMap() {
    const rows = await SiteSetting.findAll();
    const m = {};
    rows.forEach((r) => {
        m[r.key] = r.value;
    });
    return m;
}

function parseBool(v, def = true) {
    if (v === undefined || v === null) return def;
    return String(v) === 'true' || v === true;
}

function parseNum(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

/**
 * Sunucu tarafı sepet tutarı doğrulaması (kupon + kargo + KDV gösterimi fiyatı etkilemez — fiyat üründen).
 */
async function computeExpectedTotal({ items, couponCode }) {
    const settings = await loadSettingsMap();

    const shippingFeeEnabled = parseBool(settings.shippingFeeEnabled, true);
    const freeShippingEnabled = parseBool(settings.freeShippingEnabled, true);
    const standardShippingFee = parseNum(settings.standardShippingFee, 50);
    const freeShippingThreshold = parseNum(settings.freeShippingThreshold, 500);

    let subtotal = 0;
    for (const line of items) {
        const q = Math.floor(Number(line.quantity) || 0);
        const p = Number(line.price);
        if (q < 1 || !Number.isFinite(p)) {
            const err = new Error('Sepet satırı geçersiz.');
            err.code = 'BAD_LINE';
            throw err;
        }
        subtotal += p * q;
    }

    let discountPercent = 0;
    if (couponCode && String(couponCode).trim()) {
        const code = String(couponCode).trim().toUpperCase();
        const coupon = await Coupon.findOne({
            where: { code, isActive: true },
        });
        const now = new Date();
        if (!coupon) {
            const err = new Error('Geçersiz kupon.');
            err.code = 'BAD_COUPON';
            throw err;
        }
        if (coupon.startsAt && new Date(coupon.startsAt) > now) {
            const err = new Error('Kupon henüz geçerli değil.');
            err.code = 'BAD_COUPON';
            throw err;
        }
        if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
            const err = new Error('Kupon süresi dolmuş.');
            err.code = 'BAD_COUPON';
            throw err;
        }
        const minAmt = parseNum(coupon.minOrderAmount, 0);
        if (subtotal < minAmt) {
            const err = new Error('Minimum sepet tutarı sağlanmıyor.');
            err.code = 'BAD_COUPON';
            throw err;
        }
        discountPercent = Math.min(99, Math.max(0, Number(coupon.discountPercent) || 0));
    }

    const discountAmount = subtotal * (discountPercent / 100);
    const afterDisc = subtotal - discountAmount;

    const qualifiesFree =
        freeShippingEnabled && freeShippingThreshold > 0 && afterDisc >= freeShippingThreshold;
    const shipping =
        items.length === 0 || !shippingFeeEnabled || qualifiesFree ? 0 : standardShippingFee;

    const total = afterDisc + shipping;

    return { subtotal, discountPercent, discountAmount, shipping, total: Number(total.toFixed(2)) };
}

function totalsMatchClient(expectedTotal, clientTotal, tolerance = 0.05) {
    const exp = Number(expectedTotal);
    const cli = Number(clientTotal);
    return Math.abs(exp - cli) <= tolerance;
}

module.exports = { computeExpectedTotal, totalsMatchClient, loadSettingsMap };
