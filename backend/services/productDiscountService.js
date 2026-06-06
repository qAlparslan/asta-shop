const { Op } = require('sequelize');
const Product = require('../models/Product');
const sequelize = require('../config/database');

/** @param {unknown} v */
function parseProductMoney(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** @param {{ original_price?: unknown; price?: unknown }} product */
function resolveListPrice(product) {
    const orig = parseProductMoney(product.original_price);
    const pr = parseProductMoney(product.price);
    if (orig > 0) return orig;
    if (pr > 0) return pr;
    return 0;
}

/** @param {number} listPrice @param {number} discountPercent */
function computeDiscountedPrice(listPrice, discountPercent) {
    const pct = parseInt(String(discountPercent), 10);
    if (!Number.isFinite(pct) || pct < 1 || pct > 99) return null;
    const next = listPrice - (listPrice * pct) / 100;
    return Math.max(0, Number(next.toFixed(2)));
}

/**
 * @param {{ discountPercent?: unknown; discountStartsAt?: unknown; discountExpiresAt?: unknown }} plan
 * @param {Date} [now]
 */
function isDiscountActiveNow(plan, now = new Date()) {
    const pct = parseInt(String(plan.discountPercent), 10);
    if (!Number.isFinite(pct) || pct < 1) return false;
    if (!plan.discountStartsAt) return false;
    const start =
        plan.discountStartsAt instanceof Date
            ? plan.discountStartsAt
            : new Date(plan.discountStartsAt);
    if (Number.isNaN(start.getTime()) || start > now) return false;
    if (!plan.discountExpiresAt) return true;
    const end =
        plan.discountExpiresAt instanceof Date
            ? plan.discountExpiresAt
            : new Date(plan.discountExpiresAt);
    return !Number.isNaN(end.getTime()) && end > now;
}

/**
 * Tek ürün veya toplu indirim planı için güncelleme alanları.
 * @param {{ original_price?: unknown; price?: unknown }} product
 * @param {{ pct: number; startAt: Date; endAt?: Date | null }} plan
 */
function buildPlannedDiscountUpdate(product, { pct, startAt, endAt = null }) {
    const listPrice = resolveListPrice(product);
    const listStr = listPrice.toFixed(2);
    const now = new Date();

    /** @type {Record<string, string | number | Date | null>} */
    const payload = {
        original_price: listStr,
        discountPercent: pct,
        discountStartsAt: startAt,
        discountExpiresAt: endAt || null,
    };

    if (
        isDiscountActiveNow(
            { discountPercent: pct, discountStartsAt: startAt, discountExpiresAt: endAt },
            now,
        )
    ) {
        const discounted = computeDiscountedPrice(listPrice, pct);
        if (discounted != null) {
            payload.price = discounted.toFixed(2);
        }
    } else {
        payload.price = listStr;
    }

    return payload;
}

async function runDiscountAutomationTick() {
    const now = new Date();

    const toStart = await Product.findAll({
        where: {
            discountStartsAt: { [Op.lte]: now },
            discountPercent: { [Op.gt]: 0 },
            original_price: { [Op.not]: null },
            price: { [Op.eq]: sequelize.col('original_price') },
        },
    });

    for (const p of toStart) {
        const currentOriginal = parseProductMoney(p.original_price);
        const discountPercent = parseInt(p.discountPercent, 10);
        const newPrice = computeDiscountedPrice(currentOriginal, discountPercent);
        if (newPrice == null) continue;

        const beforeDiscount = {
            price: p.price,
            original_price: p.original_price,
            discountPercent: p.discountPercent,
        };
        await p.update({ price: newPrice.toFixed(2) });
        console.log(
            `[OTOMATİK SİSTEM]: ${p.name} için %${discountPercent} indirim uygulandı. Yeni Fiyat: ${newPrice.toFixed(2)}₺`,
        );
        const { maybeNotifyCartHoldersAfterDiscount } = require('./cartInterestService');
        setImmediate(() =>
            maybeNotifyCartHoldersAfterDiscount(p.id, beforeDiscount).catch((err) =>
                console.error('[cart-discount-notify]', err.message || err),
            ),
        );
    }

    const toEnd = await Product.findAll({
        where: {
            discountExpiresAt: { [Op.lte]: now },
            original_price: { [Op.not]: null },
        },
    });

    for (const p of toEnd) {
        await p.update({
            price: p.original_price,
            original_price: null,
            discountPercent: null,
            discountStartsAt: null,
            discountExpiresAt: null,
        });
        console.log(
            `[OTOMATİK SİSTEM]: ${p.name} ürününün indirim süresi bitti. Eski fiyatına döndürüldü.`,
        );
    }
}

module.exports = {
    resolveListPrice,
    computeDiscountedPrice,
    isDiscountActiveNow,
    buildPlannedDiscountUpdate,
    runDiscountAutomationTick,
};
