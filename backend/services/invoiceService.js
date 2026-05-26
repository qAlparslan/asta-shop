/**
 * Ödeme sonrası Paraşüt entegrasyonu (sadece TASLAK).
 * Bu modül artık yalnızca taslak (estimate / proforma) satış faturası oluşturur.
 * Resmileştirme, tahsilat kaydı, e-arşiv, GİB iletimi YOKTUR.
 */

const Order = require('../models/Order');
const { appendInvoiceError } = require('../utils/invoiceErrorLog');
const {
    createDraftSalesInvoiceForOrder,
    isParasutAutomationEnabled,
    notifyAdminsOfParasutFailure,
} = require('./parasutInvoiceService');

/**
 * @param {string} orderId
 */
async function processPostPaymentParasut(orderId) {
    if (!isParasutAutomationEnabled()) return;

    let order;
    try {
        order = await Order.findByPk(orderId);
        if (!order || order.status === 'iptal-edildi') return;
        if (
            order.eInvoiceIntegrationRef &&
            String(order.eInvoiceIntegrationRef).startsWith('ps:draft:si:')
        ) {
            console.log(
                '[invoice]',
                orderId,
                'Paraşüt taslak zaten oluşturulmuş — tekrar çağrılmadı.',
            );
            return;
        }

        const r = await createDraftSalesInvoiceForOrder(order);
        console.log(
            '[invoice]',
            orderId,
            'Paraşüt taslak satış faturası oluşturuldu:',
            r.salesInvoiceId,
        );
    } catch (e) {
        const msg = e?.message || String(e);
        await appendInvoiceError({
            stage: 'post_payment_parasut_draft',
            orderId,
            message: msg,
            detail: e?.stack,
        });
        console.error('[invoice]', orderId, 'Paraşüt taslak:', msg);

        try {
            const fresh = await Order.findByPk(orderId);
            if (fresh) {
                await notifyAdminsOfParasutFailure(fresh, e);
                await fresh
                    .update({
                        eInvoiceLastError: `Paraşüt: ${msg}`.slice(0, 2000),
                    })
                    .catch(() => {});
            }
        } catch (inner) {
            console.error('[invoice] bildirim/DB yazısı:', inner?.message || inner);
        }
    }
}

/**
 * Ödeme başarısından sonra arka plan işi sıraya alır (bloklamaz).
 * @param {string} orderId
 */
function enqueuePostPaymentInvoicing(orderId) {
    const id = String(orderId || '');
    if (!id || !isParasutAutomationEnabled()) return;

    setImmediate(() => {
        processPostPaymentParasut(id).catch((err) => {
            appendInvoiceError({
                stage: 'enqueue_fallback',
                orderId: id,
                message: err?.message || String(err),
                detail: err?.stack,
            }).catch(() => {});
            console.error('enqueuePostPaymentInvoicing:', id, err?.message || err);
        });
    });
}

module.exports = {
    processPostPaymentParasut,
    enqueuePostPaymentInvoicing,
};
