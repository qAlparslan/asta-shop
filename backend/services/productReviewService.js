const { Op, fn, col } = require('sequelize');
const Order = require('../models/Order');
const ProductReview = require('../models/ProductReview');

const PURCHASE_STATUSES = ['hazirlaniyor', 'kargolandi', 'teslim-edildi'];

function parseOrderItems(raw) {
    if (!raw) return [];
    let items = raw;
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch {
            return [];
        }
    }
    return Array.isArray(items) ? items : [];
}

function orderContainsProduct(items, productId) {
    const pid = String(productId);
    return parseOrderItems(items).some((item) => {
        const id = String(item?.id || item?.productId || '').trim();
        return id === pid;
    });
}

async function getUserQualifyingOrdersForProduct(userId, productId) {
    if (!userId || !productId) return [];
    const orders = await Order.findAll({
        where: {
            userId,
            status: { [Op.in]: PURCHASE_STATUSES },
        },
        attributes: ['id', 'items', 'createdAt'],
        order: [['createdAt', 'DESC']],
    });
    return orders.filter((o) => orderContainsProduct(o.items, productId));
}

/** Kaç ayrı siparişte bu ürün satın alınmış (her sipariş = 1 yorum hakkı). */
async function countUserProductPurchases(userId, productId) {
    const orders = await getUserQualifyingOrdersForProduct(userId, productId);
    return orders.length;
}

async function countUserProductReviews(userId, productId) {
    if (!userId || !productId) return 0;
    return ProductReview.count({ where: { productId, userId } });
}

async function getUserProductReviewAllowance(userId, productId) {
    const [purchaseCount, reviewCount] = await Promise.all([
        countUserProductPurchases(userId, productId),
        countUserProductReviews(userId, productId),
    ]);
    const remainingReviews = Math.max(0, purchaseCount - reviewCount);
    return {
        purchaseCount,
        reviewCount,
        remainingReviews,
        canReview: remainingReviews > 0,
        purchased: purchaseCount > 0,
    };
}

async function userPurchasedProduct(userId, productId) {
    const n = await countUserProductPurchases(userId, productId);
    return n > 0;
}

async function getReviewStatsMap(productIds) {
    const ids = [...new Set((productIds || []).map((id) => String(id)).filter(Boolean))];
    const map = new Map();
    if (!ids.length) return map;

    const rows = await ProductReview.findAll({
        attributes: [
            'productId',
            [fn('AVG', col('rating')), 'averageRating'],
            [fn('COUNT', col('id')), 'reviewCount'],
        ],
        where: { productId: { [Op.in]: ids }, approved: true },
        group: ['productId'],
        raw: true,
    });

    for (const row of rows) {
        const count = Math.max(0, parseInt(String(row.reviewCount), 10) || 0);
        const avg = count > 0 ? Math.round(Number(row.averageRating) * 10) / 10 : 0;
        map.set(String(row.productId), { reviewCount: count, averageRating: avg });
    }
    return map;
}

async function getReviewStats(productId) {
    const map = await getReviewStatsMap([productId]);
    return map.get(String(productId)) || { reviewCount: 0, averageRating: 0 };
}

function attachReviewStatsToProduct(product, statsMap) {
    const json = product?.toJSON ? product.toJSON() : { ...product };
    const stat = statsMap.get(String(json.id)) || { reviewCount: 0, averageRating: 0 };
    return {
        ...json,
        reviewCount: stat.reviewCount,
        averageRating: stat.averageRating,
    };
}

async function attachReviewStatsToProducts(products) {
    const list = Array.isArray(products) ? products : [];
    const statsMap = await getReviewStatsMap(list.map((p) => p.id));
    return list.map((p) => attachReviewStatsToProduct(p, statsMap));
}

function parseReviewImages(raw) {
    if (raw == null || raw === '') return [];
    let arr = raw;
    if (typeof arr === 'string') {
        try {
            arr = JSON.parse(arr);
        } catch {
            return [];
        }
    }
    if (!Array.isArray(arr)) return [];
    return arr
        .filter((x) => typeof x === 'string' && x.trim())
        .map((x) => x.trim())
        .slice(0, 4);
}

function serializeReview(review) {
    const json = review?.toJSON ? review.toJSON() : { ...review };
    delete json.notifyEmail;
    return {
        ...json,
        images: parseReviewImages(json.images),
    };
}

module.exports = {
    PURCHASE_STATUSES,
    userPurchasedProduct,
    countUserProductPurchases,
    countUserProductReviews,
    getUserProductReviewAllowance,
    getReviewStatsMap,
    getReviewStats,
    attachReviewStatsToProduct,
    attachReviewStatsToProducts,
    parseReviewImages,
    serializeReview,
};
