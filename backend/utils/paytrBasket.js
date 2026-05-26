const { computeExpectedTotal } = require('../services/orderPricing');

function round2(x) {
    return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
}

function toMinor(amount) {
    return Math.round(round2(Number(amount)) * 100);
}

function minorToFixed2(minor) {
    return (minor / 100).toFixed(2);
}

/**
 * Pozitif ağırlıklarla tam olarak `targetMinor` dağıtır (son satır bakiyeyi kapar).
 */
function allocateProportionalMinor(weights, targetMinor) {
    const n = weights.length;
    const out = new Array(n).fill(0);
    if (n === 0 || targetMinor <= 0) return out;

    const floored = weights.map((w) => Math.max(0, Math.floor(Number(w))));
    const W = floored.reduce((s, w) => s + w, 0);

    if (W <= 0) {
        const base = Math.floor(targetMinor / n);
        let r = targetMinor - base * n;
        for (let i = 0; i < n; i++) {
            out[i] = base + (r > 0 ? 1 : 0);
            if (r > 0) r -= 1;
        }
        return out;
    }

    let sum = 0;
    for (let i = 0; i < n - 1; i++) {
        const chunk = Math.floor((targetMinor * floored[i]) / W);
        out[i] = chunk;
        sum += chunk;
    }
    out[n - 1] = targetMinor - sum;
    return out;
}

/** @param {{ items: unknown }} orderJson */
function parseOrderItems(orderJson) {
    const raw = orderJson?.items;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

/**
 * PayTR user_basket: base64( JSON.stringify([[ad, "birim_fiyat", adet], ...]) )
 * Sepet kalem toplamları payment_amount ile birebir eşleşmeli — kuruş bazlı proportional
 * dağıtım yapılır, kupon/kargo ayarlanır. Her satır qty=1 olarak gönderilir; "price" değeri
 * o satırın TL toplamıdır.
 *
 * @param {Record<string, unknown>} orderJson — Order.toJSON()
 * @returns {Promise<string>} Base64 sepet
 */
async function buildPaytrUserBasketBase64FromOrder(orderJson) {
    const itemsArr = parseOrderItems(orderJson);
    if (!itemsArr.length) {
        throw new Error('PayTR sepeti için sipariş kalemleri bulunamadı.');
    }

    const couponCode =
        orderJson.couponCode != null && String(orderJson.couponCode).trim()
            ? String(orderJson.couponCode).trim().toUpperCase()
            : undefined;

    const pricing = await computeExpectedTotal({ items: itemsArr, couponCode });

    const targetMinor = toMinor(orderJson.totalAmount);
    if (!Number.isFinite(targetMinor) || targetMinor <= 0) {
        throw new Error('Sipariş tutarı geçersiz.');
    }

    const pricingTotalMinor = toMinor(pricing.total);
    /** Eski sipariş kupon kullanmış olabilir; toplamlar 6 kuruştan fazla ayrılırsa tek satıra düş. */
    if (Math.abs(pricingTotalMinor - targetMinor) > 6) {
        const rows = [['Sepet ozeti', minorToFixed2(targetMinor), 1]];
        return Buffer.from(JSON.stringify(rows), 'utf8').toString('base64');
    }

    const weighted = itemsArr.map((item) => {
        const qty = Math.floor(Number(item.quantity) || 0);
        const unit = Number(item.price);
        const lineRaw = qty > 0 && Number.isFinite(unit) ? round2(unit * qty) : 0;
        return { item, lineMinor: toMinor(lineRaw) };
    });

    const subSumMinor = weighted.reduce((s, w) => s + w.lineMinor, 0);
    if (!(subSumMinor > 0)) {
        throw new Error('Ürün satır tutarları geçersiz.');
    }

    let shippingMinor = Math.max(0, toMinor(pricing.shipping));
    if (shippingMinor > targetMinor) shippingMinor = 0;
    let goodsTargetMinor = targetMinor - shippingMinor;
    if (goodsTargetMinor < 0) {
        shippingMinor = 0;
        goodsTargetMinor = targetMinor;
    }

    const weights = weighted.map((w) => w.lineMinor);
    const allocatedMinor = allocateProportionalMinor(weights, goodsTargetMinor);
    const allocSum = allocatedMinor.reduce((s, x) => s + x, 0);
    if (allocSum !== goodsTargetMinor) {
        throw new Error('PayTR sepet dağılımı hesaplanamadı.');
    }

    const rows = weighted.map(({ item }, i) => {
        const name = String(item.name || 'Ürün').slice(0, 200);
        return [name, minorToFixed2(allocatedMinor[i] ?? 0), 1];
    });

    if (shippingMinor > 0) {
        rows.push(['Kargo ücreti', minorToFixed2(shippingMinor), 1]);
    }

    const basketSumMinor = rows.reduce((s, r) => s + toMinor(r[1]), 0);
    if (basketSumMinor !== targetMinor) {
        throw new Error(
            `PayTR sepet toplamı sipariş tutarıyla eşleşmiyor (${basketSumMinor} ≠ ${targetMinor} kr).`,
        );
    }

    return Buffer.from(JSON.stringify(rows), 'utf8').toString('base64');
}

module.exports = { buildPaytrUserBasketBase64FromOrder };
