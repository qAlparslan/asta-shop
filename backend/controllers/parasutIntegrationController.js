const Order = require('../models/Order');
const { requireParasutConfig, getAccessToken, apiRequest } = require('../services/parasutClient');
const {
    createDraftSalesInvoiceForOrder,
    notifyAdminsOfParasutFailure,
} = require('../services/parasutInvoiceService');

/**
 * OAuth + basit API çağrısı — ortam değişkenlerini doğrulamak için.
 */
exports.ping = async (req, res) => {
    try {
        const cfg = requireParasutConfig();
        await getAccessToken();
        await apiRequest('GET', `/${cfg.companyId}/contacts?page[size]=1`);
        res.status(200).json({
            status: 'success',
            message: 'Paraşüt bağlantısı başarılı.',
            data: { companyId: cfg.companyId },
        });
    } catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message || String(err),
        });
    }
};

/**
 * Siparişe tekrar Paraşüt satış faturası (taslak) oluşturmayı dener (admin).
 */
exports.submitOrderEInvoice = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.orderId);
        if (!order) {
            return res.status(404).json({ status: 'fail', message: 'Sipariş bulunamadı.' });
        }

        const r = await createDraftSalesInvoiceForOrder(order);
        await order.reload();

        res.status(200).json({
            status: 'success',
            message: 'Paraşüt’te satış faturası kaydı oluşturuldu.',
            data: {
                eInvoiceStatus: order.eInvoiceStatus,
                eInvoiceIntegrationRef: order.eInvoiceIntegrationRef,
                salesInvoiceId: r.salesInvoiceId,
            },
        });
    } catch (err) {
        const msg = err.message || String(err);
        try {
            const order = await Order.findByPk(req.params.orderId);
            if (order) {
                await notifyAdminsOfParasutFailure(order, err);
                await order.update({
                    eInvoiceLastError: msg.slice(0, 2000),
                });
            }
        } catch {
            /* */
        }
        res.status(500).json({ status: 'fail', message: msg });
    }
};
