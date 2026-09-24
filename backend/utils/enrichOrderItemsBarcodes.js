const Product = require('../models/Product');

/** @param {unknown} raw */
function parseItems(raw) {
    if (raw == null) return [];
    if (typeof raw === 'string') {
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch {
            return [];
        }
    }
    return Array.isArray(raw) ? raw : [];
}

/**
 * Sipariş kalemlerine güncel ürün barkodunu ekler (snapshot'ta yoksa).
 * @param {Array<import('sequelize').Model>|Array<Record<string, unknown>>} orders
 */
async function enrichOrdersItemsWithBarcodes(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return orders;

    const productIds = new Set();
    for (const o of orders) {
        const plain = o && typeof o.toJSON === 'function' ? o.toJSON() : o;
        for (const it of parseItems(plain?.items)) {
            const pid = it?.id;
            if (pid) productIds.add(String(pid));
        }
    }

    /** @type {Map<string, string>} */
    const barcodeByProductId = new Map();
    if (productIds.size > 0) {
        const rows = await Product.findAll({
            where: { id: [...productIds] },
            attributes: ['id', 'barcode'],
            raw: true,
        });
        for (const p of rows) {
            const bc = String(p.barcode ?? '').trim();
            if (bc) barcodeByProductId.set(String(p.id), bc);
        }
    }

    return orders.map((o) => {
        const plain = o && typeof o.toJSON === 'function' ? o.toJSON() : { ...o };
        const items = parseItems(plain.items).map((it) => {
            const pid = it?.id != null ? String(it.id) : '';
            const fromItem = String(it?.barcode ?? '').trim();
            const fromProduct = pid ? barcodeByProductId.get(pid) || '' : '';
            const barcode = fromItem || fromProduct;
            return barcode ? { ...it, barcode } : { ...it, barcode: fromProduct || null };
        });
        return { ...plain, items };
    });
}

module.exports = { enrichOrdersItemsWithBarcodes, parseItems };
