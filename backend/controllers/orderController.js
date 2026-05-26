const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const SiteSetting = require('../models/SiteSetting');
const { Op, fn, col, Sequelize } = require('sequelize');
const {
    sendOrderStatusUpdateEmail,
} = require('../services/orderEmailService');
const { logAdminAudit } = require('../services/auditService');

/** Cron / tracking poller — orderEmailService ile aynı. */
exports.sendOrderStatusUpdateEmail = sendOrderStatusUpdateEmail;

/**
 * Eski uç (doğrudan kart bilgisi alarak ödeme alıyordu) kaldırıldı.
 * Yeni akış: PayTR iFrame — `POST /api/payments/create-payment`.
 */
exports.createOrder = async (_req, res) => {
    return res.status(410).json({
        status: 'fail',
        message:
            'Bu uç artık kullanılmıyor. Lütfen ödeme başlatmak için POST /api/payments/create-payment çağırın (PayTR iFrame).',
    });
};

/**
 * Giriş yapmış müşterinin siparişleri (userId veya aynı e-posta — eski kayıtlar için).
 */
exports.listMyOrders = async (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
        const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

        const userEmailNorm = String(req.user.email || '').trim().toLowerCase();

        const emailMatchesAccount =
            userEmailNorm.length > 0 &&
            Sequelize.where(
                fn('LOWER', fn('TRIM', col('email'))),
                '=',
                userEmailNorm
            );

        const rows = await Order.findAll({
            where:
                emailMatchesAccount
                    ? { [Op.or]: [{ userId: req.user.id }, emailMatchesAccount] }
                    : { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.status(200).json({
            status: 'success',
            data: {
                orders: rows,
                pagination: { limit, offset, count: rows.length },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 2. ADMIN DASHBOARD İSTATİSTİKLERİ
exports.getDashboardStats = async (req, res) => {
    try {
        const timeFilter = req.query.time || 'daily';
        const now = new Date();
        let startDate = new Date();

        switch (timeFilter) {
            case 'daily': startDate.setHours(0, 0, 0, 0); break;
            case 'weekly': startDate.setDate(now.getDate() - 7); break;
            case 'monthly': startDate.setMonth(now.getMonth() - 1); break;
            case 'yearly': startDate.setFullYear(now.getFullYear() - 1); break;
            case 'all': default: startDate = new Date(0); break;
        }

        const dateQuery = { createdAt: { [Op.gte]: startDate } };
        const paidQuery = {
            createdAt: { [Op.gte]: startDate },
            status: { [Op.in]: ['hazirlaniyor', 'kargolandi', 'teslim-edildi'] },
        };

        const ordersCount = await Order.count({ where: paidQuery });
        const totalEarnings = await Order.sum('totalAmount', { where: paidQuery }) || 0;
        const pendingOrdersCount = await Order.count({ where: { status: 'hazirlaniyor' } });

        const recentOrders = await Order.findAll({
            where: dateQuery,
            limit: 8,
            order: [['createdAt', 'DESC']]
        });

        const allOrdersInTimeframe = await Order.findAll({ where: paidQuery });
        const productSales = {};

        allOrdersInTimeframe.forEach(order => {
            const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            items.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        name: item.name,
                        image: item.images && item.images.length > 0 ? item.images[0] : null,
                        salesCount: 0,
                        totalRevenue: 0
                    };
                }
                productSales[item.id].salesCount += item.quantity;
                productSales[item.id].totalRevenue += (item.price * item.quantity);
            });
        });

        const topSellers = Object.values(productSales)
            .sort((a, b) => b.salesCount - a.salesCount)
            .slice(0, 3);

        const statuses = [
            'odeme_bekleniyor',
            'hazirlaniyor',
            'kargolandi',
            'teslim-edildi',
            'iptal-edildi',
        ];
        const statusCounts = {};
        await Promise.all(
            statuses.map(async (st) => {
                statusCounts[st] = await Order.count({
                    where: { ...dateQuery, status: st },
                });
            }),
        );

        const customerCount = await User.count({ where: { role: 'customer' } });

        let lowStockThreshold = 5;
        const thRow = await SiteSetting.findOne({ where: { key: 'lowStockThreshold' } });
        if (thRow && thRow.value != null) {
            const n = Number(thRow.value);
            if (Number.isFinite(n) && n >= 0) lowStockThreshold = n;
        }
        const lowStockCount = await Product.count({
            where: {
                stock: { [Op.lte]: lowStockThreshold },
                is_active: true,
            },
        });
        const lowStockProducts = await Product.findAll({
            attributes: ['id', 'name', 'stock', 'brand', 'images'],
            where: {
                stock: { [Op.lte]: lowStockThreshold },
                is_active: true,
            },
            order: [['stock', 'ASC']],
            limit: 10,
        });

        const sevenAgo = new Date();
        sevenAgo.setDate(sevenAgo.getDate() - 6);
        sevenAgo.setHours(0, 0, 0, 0);

        const trendRows = await Order.findAll({
            attributes: [
                [fn('DATE', col('createdAt')), 'day'],
                [fn('SUM', col('totalAmount')), 'revenue'],
                [fn('COUNT', col('id')), 'orderCount'],
            ],
            where: {
                createdAt: { [Op.gte]: sevenAgo },
                status: { [Op.in]: ['hazirlaniyor', 'kargolandi', 'teslim-edildi'] },
            },
            group: [fn('DATE', col('createdAt'))],
            raw: true,
        });

        const dayKey = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const byDay = {};
        trendRows.forEach((r) => {
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
        const revenueTrend = [];
        for (let i = 0; i < 7; i++) {
            const cur = new Date(sevenAgo);
            cur.setDate(cur.getDate() + i);
            const k = dayKey(cur);
            const agg = byDay[k] || { revenue: 0, orderCount: 0 };
            revenueTrend.push({
                date: k,
                label: weekdayShort[cur.getDay()],
                revenue: Math.round(Number(agg.revenue) * 100) / 100,
                orderCount: agg.orderCount,
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                ordersCount,
                totalEarnings,
                pendingOrdersCount,
                recentOrders,
                topSellers,
                customerCount,
                statusCounts,
                shippedCount: statusCounts.kargolandi,
                deliveredCount: statusCounts['teslim-edildi'],
                cancelledCount: statusCounts['iptal-edildi'],
                awaitingPaymentCount: statusCounts.odeme_bekleniyor,
                preparingCount: statusCounts.hazirlaniyor,
                lowStockCount,
                lowStockThreshold,
                lowStockProducts,
                revenueTrend,
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 3. TÜM SİPARİŞLERİ GETİR
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({ status: 'success', data: { orders } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 4. SİPARİŞLERİ CSV OLARAK DIŞA AKTAR (Excel uyumlu UTF-8 BOM)
exports.exportOrdersCsv = async (req, res) => {
    try {
        const orders = await Order.findAll({
            order: [['createdAt', 'DESC']],
            raw: true,
        });

        const headers = [
            'id',
            'createdAt',
            'fullName',
            'email',
            'phone',
            'address',
            'status',
            'totalAmount',
            'couponCode',
            'trackingNumber',
            'wantsElectronicInvoice',
            'invoiceTaxNumber',
            'invoiceCompanyTitle',
            'invoiceTaxOffice',
            'eInvoiceStatus',
            'eInvoiceIntegrationRef',
            'eInvoiceLastError',
            'itemsJson',
        ];

        const escape = (val) => {
            const s = String(val ?? '').replace(/"/g, '""');
            return `"${s}"`;
        };

        const rowLines = orders.map((o) => {
            const itemsJson =
                typeof o.items === 'string' ? o.items : JSON.stringify(o.items ?? []);
            return [
                o.id,
                o.createdAt ? new Date(o.createdAt).toISOString() : '',
                o.fullName,
                o.email,
                o.phone,
                o.address,
                o.status,
                o.totalAmount,
                o.couponCode || '',
                o.trackingNumber || '',
                o.wantsElectronicInvoice ? '1' : '0',
                o.invoiceTaxNumber || '',
                o.invoiceCompanyTitle || '',
                o.invoiceTaxOffice || '',
                o.eInvoiceStatus || '',
                o.eInvoiceIntegrationRef || '',
                o.eInvoiceLastError || '',
                itemsJson,
            ]
                .map(escape)
                .join(',');
        });

        const csv = [headers.join(','), ...rowLines].join('\r\n');
        const bom = '\ufeff';

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="siparisler.csv"');
        res.send(bom + csv);
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/**
 * Siparişi kargoya ver (DHL takip no + kargolandi + müşteri maili).
 * POST /api/orders/:id/ship  { trackingNumber }
 */
exports.shipOrder = async (req, res) => {
    try {
        const trackingNumber = String(req.body?.trackingNumber || '').trim();
        if (!trackingNumber) {
            return res.status(400).json({ status: 'fail', message: 'Kargo takip numarası zorunludur.' });
        }

        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ status: 'fail', message: 'Sipariş bulunamadı.' });

        const allowed = ['hazirlaniyor', 'kargolandi'];
        if (!allowed.includes(order.status)) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'Bu sipariş kargoya verilemez. Yalnızca "hazırlanıyor" veya tekrar takip güncellemesi için "kargoda" siparişlerde kullanılır.',
            });
        }

        const now = new Date();
        await order.update({
            trackingNumber,
            carrier: 'DHL',
            status: 'kargolandi',
            shippedAt: order.shippedAt || now,
        });
        await order.reload();

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'order.ship',
            entityType: 'order',
            entityId: order.id,
            meta: { trackingNumber, carrier: 'DHL' },
        });

        sendOrderStatusUpdateEmail(order, 'kargolandi');

        res.status(200).json({
            status: 'success',
            message: 'Sipariş kargoya verildi. Müşteriye e-posta gönderildi.',
            data: { order },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// 5. SİPARİŞ DURUMUNU GÜNCELLE
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status, trackingNumber } = req.body;
        const order = await Order.findByPk(req.params.id);

        if (!order) return res.status(404).json({ status: 'fail', message: 'Sipariş bulunamadı.' });

        const oldStatus = order.status;
        const oldTracking = order.trackingNumber;
        const patch = {};
        if (status !== undefined) patch.status = status;
        if (trackingNumber !== undefined) patch.trackingNumber = trackingNumber || null;
        if (status === 'kargolandi' && trackingNumber) {
            patch.carrier = 'DHL';
            if (!order.shippedAt) patch.shippedAt = new Date();
        }
        await order.update(patch);
        await order.reload();

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'order.update',
            entityType: 'order',
            entityId: order.id,
            meta: {
                statusFrom: oldStatus,
                statusTo: order.status,
                trackingFrom: oldTracking,
                trackingTo: order.trackingNumber,
            },
        });

        if (status && status !== oldStatus) {
            sendOrderStatusUpdateEmail(order, status);
        }

        res.status(200).json({ status: 'success', message: 'Sipariş başarıyla güncellendi.', data: { order } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};