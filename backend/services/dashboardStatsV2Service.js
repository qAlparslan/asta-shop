const { Op, fn, col, literal } = require('sequelize');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const ProductQuestion = require('../models/ProductQuestion');
const SiteSetting = require('../models/SiteSetting');
const { getCartStatsMap } = require('./cartInterestService');

const PAID_STATUSES = ['hazirlaniyor', 'kargolandi', 'teslim-edildi'];
const ALL_STATUSES = ['odeme_bekleniyor', ...PAID_STATUSES, 'iptal-edildi'];

const PERIOD_LABELS = {
    daily: 'Bugün',
    weekly: 'Bu Hafta',
    monthly: 'Bu Ay',
    yearly: 'Bu Yıl',
    all: 'Tümü',
};

/** @param {unknown} raw */
function parseOrderItems(raw) {
    if (!raw) return [];
    try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

/** @param {Date} d */
function dayKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** @param {string} timeFilter */
function resolvePeriodBounds(timeFilter) {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);
    let prevEnd = new Date(now);
    let prevStart = new Date(now);

    switch (timeFilter) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 1);
            prevStart.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            start.setDate(now.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - 6);
            prevStart.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            start.setDate(now.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - 29);
            prevStart.setHours(0, 0, 0, 0);
            break;
        case 'yearly':
            start.setFullYear(now.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
            prevEnd = new Date(start);
            prevEnd.setMilliseconds(-1);
            prevStart = new Date(prevEnd);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            prevStart.setHours(0, 0, 0, 0);
            break;
        case 'all':
        default:
            start = new Date(0);
            prevStart = null;
            prevEnd = null;
            break;
    }

    return { start, end, prevStart, prevEnd };
}

/**
 * @param {number} current
 * @param {number} previous
 */
function buildComparison(current, previous) {
    const cur = Number(current) || 0;
    const prev = Number(previous) || 0;
    const changeAmount = Math.round((cur - prev) * 100) / 100;
    let changePercent = null;
    if (prev > 0) {
        changePercent = Math.round(((cur - prev) / prev) * 1000) / 10;
    } else if (cur > 0) {
        changePercent = 100;
    } else {
        changePercent = 0;
    }
    return { current: cur, previous: prev, changeAmount, changePercent };
}

/**
 * @param {{ createdAt?: Date | string; status?: string; totalAmount?: number | string }}[] } orders
 * @param {Date} start
 * @param {Date} [end]
 */
function filterOrdersInRange(orders, start, end) {
    const startMs = start.getTime();
    const endMs = end ? end.getTime() : Number.POSITIVE_INFINITY;
    return orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= startMs && t <= endMs;
    });
}

/**
 * @param {{ status?: string; totalAmount?: number | string }[]} orders
 */
function aggregatePaidMetrics(orders) {
    const paid = orders.filter((o) => PAID_STATUSES.includes(String(o.status)));
    const revenue = paid.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const ordersCount = paid.length;
    const averageBasket = ordersCount > 0 ? revenue / ordersCount : 0;
    const cancelledAmount = orders
        .filter((o) => o.status === 'iptal-edildi')
        .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const awaitingPaymentCount = orders.filter((o) => o.status === 'odeme_bekleniyor').length;
    const awaitingPaymentAmount = orders
        .filter((o) => o.status === 'odeme_bekleniyor')
        .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    return {
        revenue: Math.round(revenue * 100) / 100,
        ordersCount,
        averageBasket: Math.round(averageBasket * 100) / 100,
        cancelledAmount: Math.round(cancelledAmount * 100) / 100,
        awaitingPaymentCount,
        awaitingPaymentAmount: Math.round(awaitingPaymentAmount * 100) / 100,
    };
}

/**
 * @param {{ items?: unknown }[]} paidOrders
 */
function buildTopSellers(paidOrders, limit = 10) {
    /** @type {Record<string, { id: string; name: string; image: string | null; salesCount: number; totalRevenue: number }>} */
    const productSales = {};

    paidOrders.forEach((order) => {
        parseOrderItems(order.items).forEach((item) => {
            const id = String(item.id || item.name || 'unknown');
            if (!productSales[id]) {
                const images = item.images;
                const image =
                    Array.isArray(images) && images.length > 0
                        ? images[0]
                        : typeof images === 'string'
                          ? images
                          : null;
                productSales[id] = {
                    id,
                    name: String(item.name || 'Ürün'),
                    image,
                    salesCount: 0,
                    totalRevenue: 0,
                };
            }
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            productSales[id].salesCount += qty;
            productSales[id].totalRevenue += price * qty;
        });
    });

    const all = Object.values(productSales).map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
    }));

    return {
        byQuantity: [...all].sort((a, b) => b.salesCount - a.salesCount).slice(0, limit),
        byRevenue: [...all].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, limit),
    };
}

/**
 * @param {string} timeFilter
 * @param {Date} start
 * @param {Date} end
 */
async function buildTrend(timeFilter, start, end) {
    const paidWhere = {
        status: { [Op.in]: PAID_STATUSES },
        createdAt: { [Op.gte]: start, [Op.lte]: end },
    };

    if (timeFilter === 'daily') {
        const rows = await Order.findAll({
            attributes: [
                [fn('HOUR', col('createdAt')), 'bucket'],
                [fn('SUM', col('totalAmount')), 'revenue'],
                [fn('COUNT', col('id')), 'orderCount'],
            ],
            where: paidWhere,
            group: [fn('HOUR', col('createdAt'))],
            raw: true,
        });
        const byHour = {};
        rows.forEach((r) => {
            const h = Number(r.bucket);
            if (!Number.isFinite(h)) return;
            byHour[h] = {
                revenue: Number(r.revenue) || 0,
                orderCount: Number(r.orderCount) || 0,
            };
        });
        const trend = [];
        for (let h = 0; h < 24; h += 1) {
            const agg = byHour[h] || { revenue: 0, orderCount: 0 };
            trend.push({
                key: String(h),
                label: `${String(h).padStart(2, '0')}:00`,
                revenue: Math.round(agg.revenue * 100) / 100,
                orderCount: agg.orderCount,
            });
        }
        return trend;
    }

    if (timeFilter === 'yearly' || timeFilter === 'all') {
        const rows = await Order.findAll({
            attributes: [
                [fn('DATE_FORMAT', col('createdAt'), '%Y-%m'), 'bucket'],
                [fn('SUM', col('totalAmount')), 'revenue'],
                [fn('COUNT', col('id')), 'orderCount'],
            ],
            where: paidWhere,
            group: [fn('DATE_FORMAT', col('createdAt'), '%Y-%m')],
            order: [[literal('bucket'), 'ASC']],
            raw: true,
        });
        const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return rows.map((r) => {
            const bucket = String(r.bucket || '');
            const [, mo] = bucket.split('-');
            const mi = Number(mo) - 1;
            return {
                key: bucket,
                label: Number.isFinite(mi) && mi >= 0 && mi < 12 ? monthNames[mi] : bucket,
                revenue: Math.round((Number(r.revenue) || 0) * 100) / 100,
                orderCount: Number(r.orderCount) || 0,
            };
        });
    }

    const dayCount = timeFilter === 'weekly' ? 7 : 30;
    const rangeStart = new Date(start);
    rangeStart.setHours(0, 0, 0, 0);

    const rows = await Order.findAll({
        attributes: [
            [fn('DATE', col('createdAt')), 'day'],
            [fn('SUM', col('totalAmount')), 'revenue'],
            [fn('COUNT', col('id')), 'orderCount'],
        ],
        where: paidWhere,
        group: [fn('DATE', col('createdAt'))],
        raw: true,
    });

    const byDay = {};
    rows.forEach((r) => {
        let k = '';
        if (r.day instanceof Date) k = dayKey(r.day);
        else if (r.day) k = String(r.day).slice(0, 10);
        if (!k) return;
        byDay[k] = {
            revenue: Number(r.revenue) || 0,
            orderCount: Number(r.orderCount) || 0,
        };
    });

    const weekdayShort = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const trend = [];
    for (let i = 0; i < dayCount; i += 1) {
        const cur = new Date(rangeStart);
        cur.setDate(cur.getDate() + i);
        if (cur.getTime() > end.getTime()) break;
        const k = dayKey(cur);
        const agg = byDay[k] || { revenue: 0, orderCount: 0 };
        const label =
            timeFilter === 'weekly'
                ? weekdayShort[cur.getDay()]
                : `${String(cur.getDate()).padStart(2, '0')}.${String(cur.getMonth() + 1).padStart(2, '0')}`;
        trend.push({
            key: k,
            label,
            revenue: Math.round(agg.revenue * 100) / 100,
            orderCount: agg.orderCount,
        });
    }
    return trend;
}

/**
 * @param {{ userId?: string | null; email?: string; status?: string; createdAt?: Date | string }[]} periodOrders
 * @param {Date} start
 */
async function buildCustomerMix(periodOrders, start) {
    const paidInPeriod = periodOrders.filter((o) => PAID_STATUSES.includes(String(o.status)));
    if (paidInPeriod.length === 0) {
        return {
            newOrders: 0,
            returningOrders: 0,
            guestOrders: 0,
            newSharePercent: 0,
            returningSharePercent: 0,
        };
    }

    const userIds = [
        ...new Set(paidInPeriod.map((o) => o.userId).filter(Boolean)),
    ];
    const guestEmails = [
        ...new Set(
            paidInPeriod
                .filter((o) => !o.userId && o.email)
                .map((o) => String(o.email).trim().toLowerCase()),
        ),
    ];

    const returningUserIds = new Set();
    if (userIds.length > 0) {
        const prior = await Order.findAll({
            attributes: ['userId'],
            where: {
                userId: { [Op.in]: userIds },
                status: { [Op.in]: PAID_STATUSES },
                createdAt: { [Op.lt]: start },
            },
            group: ['userId'],
            raw: true,
        });
        prior.forEach((r) => {
            if (r.userId) returningUserIds.add(r.userId);
        });
    }

    const returningEmails = new Set();
    if (guestEmails.length > 0) {
        const prior = await Order.findAll({
            attributes: ['email'],
            where: {
                userId: null,
                email: { [Op.in]: guestEmails },
                status: { [Op.in]: PAID_STATUSES },
                createdAt: { [Op.lt]: start },
            },
            group: ['email'],
            raw: true,
        });
        prior.forEach((r) => {
            if (r.email) returningEmails.add(String(r.email).trim().toLowerCase());
        });
    }

    let newOrders = 0;
    let returningOrders = 0;
    let guestOrders = 0;

    paidInPeriod.forEach((o) => {
        if (!o.userId) guestOrders += 1;
        const isReturning = o.userId
            ? returningUserIds.has(o.userId)
            : returningEmails.has(String(o.email || '').trim().toLowerCase());
        if (isReturning) returningOrders += 1;
        else newOrders += 1;
    });

    const total = paidInPeriod.length;
    return {
        newOrders,
        returningOrders,
        guestOrders,
        newSharePercent: total > 0 ? Math.round((newOrders / total) * 1000) / 10 : 0,
        returningSharePercent: total > 0 ? Math.round((returningOrders / total) * 1000) / 10 : 0,
    };
}

/**
 * @param {{ couponCode?: string | null; totalAmount?: number | string; status?: string }[]} periodOrders
 */
function buildCouponStats(periodOrders) {
    const paid = periodOrders.filter((o) => PAID_STATUSES.includes(String(o.status)));
    const withCoupon = paid.filter((o) => typeof o.couponCode === 'string' && o.couponCode.trim());
    /** @type {Record<string, { code: string; count: number; revenue: number }>} */
    const map = {};

    withCoupon.forEach((o) => {
        const code = String(o.couponCode).trim().toUpperCase();
        if (!map[code]) map[code] = { code, count: 0, revenue: 0 };
        map[code].count += 1;
        map[code].revenue += Number(o.totalAmount) || 0;
    });

    const topCoupons = Object.values(map)
        .map((c) => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const ordersWithCoupon = withCoupon.length;
    const couponOrderSharePercent =
        paid.length > 0 ? Math.round((ordersWithCoupon / paid.length) * 1000) / 10 : 0;

    return {
        ordersWithCoupon,
        couponOrderSharePercent,
        topCoupons,
    };
}

/** @param {{ status?: string }[]} periodOrders */
function buildFunnel(periodOrders) {
    const total = periodOrders.length || 1;
    const labels = {
        odeme_bekleniyor: 'Ödeme bekliyor',
        hazirlaniyor: 'Hazırlanıyor',
        kargolandi: 'Kargoda',
        'teslim-edildi': 'Teslim edildi',
        'iptal-edildi': 'İptal',
    };
    return ALL_STATUSES.map((status) => {
        const count = periodOrders.filter((o) => o.status === status).length;
        return {
            status,
            label: labels[status] || status,
            count,
            sharePercent: Math.round((count / total) * 1000) / 10,
        };
    }).filter((row) => row.count > 0);
}

async function buildCartInterestTop(limit = 5) {
    const products = await Product.findAll({
        where: { is_active: true },
        attributes: ['id', 'name', 'images', 'cartAddCount'],
        order: [
            ['cartAddCount', 'DESC'],
            ['name', 'ASC'],
        ],
        limit: Math.max(limit * 3, 15),
        raw: true,
    });

    const ids = products.map((p) => p.id);
    const statsMap = await getCartStatsMap(ids);

    return products
        .map((p) => {
            const stats = statsMap[p.id] || { activeHolderCount: 0, cartAddCount: 0 };
            const images = p.images;
            const image =
                Array.isArray(images) && images.length > 0
                    ? images[0]
                    : typeof images === 'string'
                      ? images
                      : null;
            return {
                id: p.id,
                name: p.name,
                image,
                activeHolderCount: stats.activeHolderCount,
                cartAddCount: Math.max(stats.activeHolderCount, stats.cartAddCount, Number(p.cartAddCount) || 0),
            };
        })
        .sort((a, b) => b.activeHolderCount - a.activeHolderCount || b.cartAddCount - a.cartAddCount)
        .slice(0, limit);
}

/**
 * @param {string} [timeFilter]
 */
async function buildDashboardStatsV2(timeFilter = 'monthly') {
    const filter = PERIOD_LABELS[timeFilter] ? timeFilter : 'monthly';
    const { start, end, prevStart, prevEnd } = resolvePeriodBounds(filter);

    const dateWhere = { createdAt: { [Op.gte]: start, [Op.lte]: end } };

    const [periodOrders, prevOrdersRaw, pendingReviews, unansweredQuestions, preparingOrders, recentOrders, trend] =
        await Promise.all([
            Order.findAll({ where: dateWhere }),
            prevStart && prevEnd
                ? Order.findAll({
                      where: { createdAt: { [Op.gte]: prevStart, [Op.lte]: prevEnd } },
                  })
                : Promise.resolve([]),
            ProductReview.count({ where: { approved: false } }),
            ProductQuestion.count({
                where: { [Op.or]: [{ answer: null }, { answer: '' }] },
            }),
            Order.count({ where: { status: 'hazirlaniyor' } }),
            Order.findAll({
                where: dateWhere,
                limit: 8,
                order: [['createdAt', 'DESC']],
            }),
            buildTrend(filter, start, end),
        ]);

    const currentMetrics = aggregatePaidMetrics(periodOrders);
    const prevPeriodOrders = prevStart && prevEnd ? filterOrdersInRange(prevOrdersRaw, prevStart, prevEnd) : [];
    const previousMetrics = aggregatePaidMetrics(prevPeriodOrders);

    const paidInPeriod = periodOrders.filter((o) => PAID_STATUSES.includes(String(o.status)));
    const topSellers = buildTopSellers(paidInPeriod, 10);

    const [customerMix, couponStats, cartInterest, funnel] = await Promise.all([
        buildCustomerMix(periodOrders, start),
        Promise.resolve(buildCouponStats(periodOrders)),
        buildCartInterestTop(5),
        Promise.resolve(buildFunnel(periodOrders)),
    ]);

    let lowStockThreshold = 5;
    const thRow = await SiteSetting.findOne({ where: { key: 'lowStockThreshold' } });
    if (thRow && thRow.value != null) {
        const n = Number(thRow.value);
        if (Number.isFinite(n) && n >= 0) lowStockThreshold = n;
    }
    const lowStockCount = await Product.count({
        where: { stock: { [Op.lte]: lowStockThreshold }, is_active: true },
    });

    return {
        period: {
            id: filter,
            label: PERIOD_LABELS[filter],
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            hasComparison: Boolean(prevStart && prevEnd),
        },
        comparison: {
            revenue: buildComparison(currentMetrics.revenue, previousMetrics.revenue),
            orders: buildComparison(currentMetrics.ordersCount, previousMetrics.ordersCount),
            averageBasket: buildComparison(currentMetrics.averageBasket, previousMetrics.averageBasket),
            cancelledAmount: buildComparison(currentMetrics.cancelledAmount, previousMetrics.cancelledAmount),
        },
        heroKpis: {
            totalRevenue: currentMetrics.revenue,
            ordersCount: currentMetrics.ordersCount,
            averageBasket: currentMetrics.averageBasket,
            cancelledAmount: currentMetrics.cancelledAmount,
            awaitingPaymentCount: currentMetrics.awaitingPaymentCount,
            awaitingPaymentAmount: currentMetrics.awaitingPaymentAmount,
        },
        funnel,
        trend,
        topSellers,
        actionItems: {
            pendingReviews,
            unansweredQuestions,
            preparingOrders,
            lowStockCount,
        },
        couponStats,
        cartInterest,
        customerMix,
        recentOrders,
    };
}

module.exports = {
    buildDashboardStatsV2,
    PERIOD_LABELS,
};
