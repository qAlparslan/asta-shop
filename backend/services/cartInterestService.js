const { Op, fn, col } = require('sequelize');
const Product = require('../models/Product');
const ProductCartHold = require('../models/ProductCartHold');
const User = require('../models/User');
const { sendMail, getMailMeta, getFrontendUrl } = require('./mailer');
const cartDiscountAlertTemplate = require('./emailTemplates/cartDiscountAlert');

/** @param {unknown} v */
function parseMoney(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** @param {{ price?: unknown; original_price?: unknown }} product */
function isProductOnSale(product) {
    const orig = parseMoney(product?.original_price);
    const price = parseMoney(product?.price);
    return orig > 0 && price < orig - 0.004;
}

/** @param {{ price?: unknown; original_price?: unknown; discountPercent?: unknown }} product */
function getActiveDiscountPercent(product) {
    if (!isProductOnSale(product)) return 0;
    const stored = parseInt(String(product?.discountPercent ?? ''), 10);
    if (Number.isFinite(stored) && stored > 0 && stored <= 99) return stored;
    const orig = parseMoney(product.original_price);
    const price = parseMoney(product.price);
    return Math.max(1, Math.round(((orig - price) / orig) * 100));
}

/** @param {{ userId?: string | null; sessionId?: string | null }} input */
function buildHolderKey({ userId, sessionId }) {
    if (userId) return `u:${userId}`;
    if (sessionId && String(sessionId).trim()) return `s:${String(sessionId).trim().slice(0, 64)}`;
    return null;
}

function formatTry(amount) {
    const n = parseMoney(amount);
    return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function productStorefrontUrl(product) {
    const base = getFrontendUrl().replace(/\/$/, '');
    const slug = typeof product?.slug === 'string' ? product.slug.trim() : '';
    if (slug) return `${base}/urun/${encodeURIComponent(slug)}`;
    if (product?.id) return `${base}/urun/p/${product.id}`;
    return base;
}

/**
 * @param {{ productId: string; variantId?: string | null; userId?: string | null; sessionId?: string | null; email?: string | null }} input
 */
async function recordCartAdd(input) {
    const productId = String(input.productId || '').trim();
    if (!productId) return;

    const product = await Product.findByPk(productId, { attributes: ['id'] });
    if (!product) return;

    await Product.increment('cartAddCount', { by: 1, where: { id: productId } });

    const holderKey = buildHolderKey(input);
    if (!holderKey) return;

    const now = new Date();
    const [hold] = await ProductCartHold.findOrCreate({
        where: { productId, holderKey },
        defaults: {
            productId,
            holderKey,
            userId: input.userId || null,
            sessionId: input.sessionId || null,
            email: input.email || null,
            variantId: input.variantId || null,
            isActive: true,
            lastAddedAt: now,
        },
    });

    await hold.update({
        userId: input.userId || hold.userId,
        sessionId: input.sessionId || hold.sessionId,
        email: input.email || hold.email,
        variantId: input.variantId || hold.variantId,
        isActive: true,
        lastAddedAt: now,
    });
}

/**
 * @param {{ userId?: string | null; sessionId?: string | null; productIds?: string[] }} input
 */
async function syncActiveCart(input) {
    const holderKey = buildHolderKey(input);
    if (!holderKey) return;

    const productIds = Array.isArray(input.productIds)
        ? [...new Set(input.productIds.map((id) => String(id).trim()).filter(Boolean))]
        : [];

    if (productIds.length > 0) {
        await ProductCartHold.update(
            { isActive: true, lastAddedAt: new Date() },
            { where: { holderKey, productId: productIds } },
        );
    }

    await ProductCartHold.update(
        { isActive: false },
        {
            where: {
                holderKey,
                ...(productIds.length > 0 ? { productId: { [Op.notIn]: productIds } } : {}),
            },
        },
    );
}

/** @param {string[]} [productIds] */
async function getCartStatsMap(productIds) {
    /** @type {Record<string, { activeHolderCount: number; cartAddCount: number }>} */
    const map = {};

    const productWhere =
        productIds && productIds.length > 0 ? { id: productIds } : undefined;

    const products = await Product.findAll({
        where: productWhere,
        attributes: ['id', 'cartAddCount'],
        raw: true,
    });

    for (const p of products) {
        map[p.id] = {
            activeHolderCount: 0,
            cartAddCount: Math.max(0, Number(p.cartAddCount) || 0),
        };
    }

    const holdWhere = { isActive: true };
    if (productIds && productIds.length > 0) {
        holdWhere.productId = productIds;
    }

    const grouped = await ProductCartHold.findAll({
        attributes: ['productId', [fn('COUNT', col('id')), 'activeHolderCount']],
        where: holdWhere,
        group: ['productId'],
        raw: true,
    });

    for (const row of grouped) {
        const pid = row.productId;
        if (!map[pid]) {
            map[pid] = { activeHolderCount: 0, cartAddCount: 0 };
        }
        map[pid].activeHolderCount = Math.max(0, Number(row.activeHolderCount) || 0);
    }

    return map;
}

/**
 * @param {import('../models/Product')} product
 * @param {number} discountPercent
 */
async function notifyCartHoldersOfDiscount(product, discountPercent) {
    const pct = Math.max(1, Math.min(99, Math.floor(Number(discountPercent)) || 0));
    if (!isProductOnSale(product)) return;

    const holds = await ProductCartHold.findAll({
        where: {
            productId: product.id,
            isActive: true,
            userId: { [Op.ne]: null },
            email: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            [Op.or]: [
                { notifiedDiscountPercent: null },
                { notifiedDiscountPercent: { [Op.lt]: pct } },
            ],
        },
    });

    if (!holds.length) return;

    const meta = await getMailMeta();
    const productUrl = productStorefrontUrl(product);
    const salePriceLabel = formatTry(product.price);
    const compareAtLabel = formatTry(product.original_price);

    const emailed = new Set();

    for (const hold of holds) {
        const to = String(hold.email || '')
            .trim()
            .toLowerCase();
        if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) continue;
        const dedupeKey = `${to}::${product.id}`;
        if (emailed.has(dedupeKey)) {
            await hold.update({ notifiedDiscountPercent: pct });
            continue;
        }
        emailed.add(dedupeKey);

        let recipientName = to.split('@')[0];
        if (hold.userId) {
            const u = await User.findByPk(hold.userId, { attributes: ['fullName', 'email'] });
            if (u?.fullName) recipientName = String(u.fullName).trim();
            else if (u?.email) recipientName = u.email.split('@')[0];
        }

        const html = cartDiscountAlertTemplate({
            recipientName,
            productName: product.name,
            productUrl,
            discountPercent: pct,
            salePriceLabel,
            compareAtLabel,
            storeName: meta.storeName,
            logoUrl: meta.logoUrl,
        });

        try {
            await sendMail({
                to,
                subject: `${meta.storeName}: Sepetinizdeki ürün %${pct} indirime girdi`,
                html,
                type: 'cartDiscountAlert',
                relatedId: hold.id,
            });
            await hold.update({ notifiedDiscountPercent: pct });
        } catch (err) {
            console.error('[cart-discount-mail]', err.message || err);
        }
    }
}

/**
 * İndirim yeni başladıysa veya yüzdesi arttıysa sepette bekleyen üyelere mail gönderir.
 * @param {string} productId
 * @param {{ price?: unknown; original_price?: unknown; discountPercent?: unknown } | null} [beforePlain]
 */
async function maybeNotifyCartHoldersAfterDiscount(productId, beforePlain = null) {
    const product = await Product.findByPk(productId);
    if (!product || !isProductOnSale(product)) return;

    const pct = getActiveDiscountPercent(product);
    if (pct < 1) return;

    const beforePct = beforePlain ? getActiveDiscountPercent(beforePlain) : 0;
    const beforeOnSale = beforePlain ? isProductOnSale(beforePlain) : false;
    if (beforeOnSale && pct <= beforePct) return;

    await notifyCartHoldersOfDiscount(product, pct);
}

module.exports = {
    isProductOnSale,
    getActiveDiscountPercent,
    recordCartAdd,
    syncActiveCart,
    getCartStatsMap,
    notifyCartHoldersOfDiscount,
    maybeNotifyCartHoldersAfterDiscount,
    productToDiscountPlain(product) {
        return {
            price: product?.price,
            original_price: product?.original_price,
            discountPercent: product?.discountPercent,
        };
    },
};
