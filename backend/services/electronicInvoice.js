const Order = require('../models/Order');

/**
 * Sipariş + entegrasyon için güvenli JSON özet (kart / hassas veri yok).
 * @param {import('../models/Order')} order
 */
function orderSnapshot(order) {
    const o = order?.toJSON ? order.toJSON() : order;
    return {
        id: o.id,
        createdAt: o.createdAt,
        fullName: o.fullName,
        email: o.email,
        phone: o.phone,
        address: o.address,
        totalAmount: o.totalAmount,
        items: Array.isArray(o.items) ? o.items : [],
        wantsElectronicInvoice: !!o.wantsElectronicInvoice,
        invoiceTaxNumber: o.invoiceTaxNumber || '',
        invoiceCompanyTitle: o.invoiceCompanyTitle || '',
        invoiceTaxOffice: o.invoiceTaxOffice || '',
    };
}

async function webhookProvider(snapshot) {
    const url = (process.env.EINVOICE_WEBHOOK_URL || '').trim();
    if (!url) {
        throw new Error('EINVOICE_WEBHOOK_URL tanımlı değil.');
    }

    const secret = (process.env.EINVOICE_WEBHOOK_SECRET || '').trim();
    const payload = JSON.stringify({ type: 'order.paid.invoice.request', order: snapshot });
    const init = {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json;charset=utf-8',
            ...(secret ? { 'X-Einvoice-Secret': secret } : {}),
        },
        body: payload,
    };

    let res;
    try {
        res = await fetch(url, init);
    } catch (e) {
        throw new Error(`Webhook isteği başarısız: ${e.message || String(e)}`);
    }

    const text = await res.text();
    let data = {};
    try {
        data = JSON.parse(text);
    } catch {
        /* yanıt boş JSON olmayabilir */
    }

    if (!res.ok) {
        throw new Error(data?.message || text || `HTTP ${res.status}`);
    }

    const ref =
        typeof data.integrationRef === 'string' && data.integrationRef.trim()
            ? data.integrationRef.trim().slice(0, 160)
            : typeof data.ref === 'string' && data.ref.trim()
              ? data.ref.trim().slice(0, 160)
              : null;

    return { ok: true, integrationRef: ref };
}

async function stubProvider(snapshot) {
    const short = String(snapshot.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    return { ok: true, integrationRef: `STUB-${short}` };
}

/**
 * Ödemesi tamamlanmış sipariş için e-fatura kuyruğunu işler.
 * @param {string} orderId
 */
async function processElectronicInvoiceForOrder(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order || !order.wantsElectronicInvoice) return;

    if (order.eInvoiceStatus !== 'awaiting_integration') return;

    const provider = (process.env.EINVOICE_PROVIDER || '').trim().toLowerCase();
    const snapshot = orderSnapshot(order);

    try {
        if (!provider || provider === 'noop') {
            await order.update({
                eInvoiceStatus: 'pending_manual',
                eInvoiceLastError: null,
            });
            return;
        }

        if (provider === 'stub') {
            const r = await stubProvider(snapshot);
            await order.update({
                eInvoiceStatus: 'submitted',
                eInvoiceIntegrationRef: r.integrationRef,
                eInvoiceLastError: null,
            });
            return;
        }

        if (provider === 'webhook') {
            const r = await webhookProvider(snapshot);
            await order.update({
                eInvoiceStatus: 'submitted',
                eInvoiceIntegrationRef: r.integrationRef || `webhook:${order.id}`,
                eInvoiceLastError: null,
            });
            return;
        }

        await order.update({
            eInvoiceStatus: 'failed',
            eInvoiceLastError: `Bilinmeyen EINVOICE_PROVIDER: ${provider}`,
        });
    } catch (e) {
        const msg = e?.message || String(e);
        await order.update({
            eInvoiceStatus: 'failed',
            eInvoiceLastError: msg.slice(0, 2000),
        });
        console.error('eInvoice:', order.id, msg);
    }
}

/**
 * Ödeme kesinleştikten sonra arka planda tetiklenir.
 * @param {string} orderId
 */
function dispatchElectronicInvoiceAfterPayment(orderId) {
    const id = String(orderId || '');
    if (!id) return;
    setImmediate(() => {
        processElectronicInvoiceForOrder(id).catch((e) =>
            console.error('eInvoice dispatch:', id, e?.message || e),
        );
    });
}

module.exports = {
    orderSnapshot,
    processElectronicInvoiceForOrder,
    dispatchElectronicInvoiceAfterPayment,
};
