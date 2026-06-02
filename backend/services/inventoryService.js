const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const ProductWarehouseStock = require('../models/ProductWarehouseStock');

let defaultWarehouseIdCache = null;

async function getOrCreateDefaultWarehouse() {
    if (defaultWarehouseIdCache) {
        const w = await Warehouse.findByPk(defaultWarehouseIdCache);
        if (w) return w;
    }
    const [wh] = await Warehouse.findOrCreate({
        where: { code: 'MAIN' },
        defaults: {
            name: 'Ana Depo',
            displayOrder: 0,
            isActive: true,
        },
    });
    defaultWarehouseIdCache = wh.id;
    return wh;
}

async function migrateLegacyStockToWarehouses() {
    await getOrCreateDefaultWarehouse();
    const wh = await Warehouse.findOne({ where: { code: 'MAIN' } });

    const products = await Product.findAll({ attributes: ['id', 'stock'] });

    for (const p of products) {
        const existing = await ProductWarehouseStock.findOne({
            where: { productId: p.id, warehouseId: wh.id },
        });
        if (!existing) {
            await ProductWarehouseStock.create({
                productId: p.id,
                warehouseId: wh.id,
                quantity: Math.max(0, Number(p.stock) || 0),
                reserved: 0,
            });
        }
    }
}

async function getAvailableStock(productId, transaction) {
    const rows = await ProductWarehouseStock.findAll({
        where: { productId },
        transaction,
    });
    let sum = 0;
    for (const r of rows) {
        sum += Math.max(0, (r.quantity || 0) - (r.reserved || 0));
    }
    return sum;
}

/**
 * `products.stock` alanını depo bazlı kullanılabilir miktarla eşitler.
 * Önemli: çağıran taraf `products` satırını `LOCK FOR UPDATE` ile kilitlemiş olabilir
 * (örn. checkout sırasında). O nedenle aynı transaction'ı geçirmek zorunludur; aksi
 * halde MySQL ~50 sn `lock_wait_timeout` ile bekler ve ödeme akışı kilitlenir.
 */
async function syncProductStockField(productId, transaction) {
    const available = await getAvailableStock(productId, transaction);
    const product = await Product.findByPk(productId, {
        attributes: ['id', 'is_active', 'autoHiddenOutOfStock'],
        transaction,
    });

    const patch = { stock: available };
    if (product) {
        if (available <= 0 && product.is_active) {
            // Stok bitti → vitrinden otomatik kaldır (manuel gizlemeden ayırt için bayrak)
            patch.is_active = false;
            patch.autoHiddenOutOfStock = true;
        } else if (available > 0 && !product.is_active && product.autoHiddenOutOfStock) {
            // Stok geri geldi ve daha önce otomatik gizlenmişti → tekrar vitrine al
            patch.is_active = true;
            patch.autoHiddenOutOfStock = false;
        }
    }

    await Product.update(patch, { where: { id: productId }, transaction });
}

async function ensureProductWarehouseRows(productId) {
    const wh = await getOrCreateDefaultWarehouse();
    const p = await Product.findByPk(productId);
    if (!p) return;
    const [row, created] = await ProductWarehouseStock.findOrCreate({
        where: { productId, warehouseId: wh.id },
        defaults: {
            quantity: Math.max(0, Number(p.stock) || 0),
            reserved: 0,
        },
    });
    if (created) {
        await syncProductStockField(productId);
    }
}

async function setMainWarehouseQuantity(productId, newQuantity, transaction) {
    const wh = await getOrCreateDefaultWarehouse();
    const qty = Math.max(0, Math.floor(Number(newQuantity) || 0));
    const [row, created] = await ProductWarehouseStock.findOrCreate({
        where: { productId, warehouseId: wh.id },
        defaults: { quantity: qty, reserved: 0 },
        transaction,
    });
    if (!created) {
        const res = Number(row.reserved) || 0;
        if (qty < res) {
            const err = new Error(
                'Stok, rezerve edilen miktardan az olamaz. Önce bekleyen siparişleri tamamlayın.'
            );
            err.code = 'STOCK_LT_RESERVED';
            throw err;
        }
        await row.update({ quantity: qty }, { transaction });
    }
    await syncProductStockField(productId, transaction);
}

async function allocateFromWarehouses(productId, needQty, transaction) {
    await ensureProductWarehouseRows(productId);
    const need = Math.floor(Number(needQty) || 0);
    if (need < 1) throw new Error('Geçersiz adet');

    const rows = await ProductWarehouseStock.findAll({
        where: { productId },
        include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'displayOrder', 'isActive'] }],
        order: [[{ model: Warehouse, as: 'warehouse' }, 'displayOrder', 'ASC']],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });

    let remaining = need;
    const parts = [];

    for (const row of rows) {
        if (!row.warehouse || !row.warehouse.isActive) continue;
        const avail = (row.quantity || 0) - (row.reserved || 0);
        if (avail <= 0) continue;
        const take = Math.min(remaining, avail);
        parts.push({
            warehouseId: row.warehouseId,
            warehouseName: row.warehouse.name,
            qty: take,
        });
        remaining -= take;
        if (remaining === 0) break;
    }

    if (remaining > 0) {
        const err = new Error('Yetersiz stok');
        err.code = 'OUT_OF_STOCK';
        throw err;
    }
    return parts;
}

async function applyReservation(parts, productId, transaction) {
    for (const part of parts) {
        await ProductWarehouseStock.increment('reserved', {
            by: part.qty,
            where: { productId, warehouseId: part.warehouseId },
            transaction,
        });
    }
}

async function releaseReservation(parts, productId, transaction) {
    for (const part of parts) {
        const row = await ProductWarehouseStock.findOne({
            where: { productId, warehouseId: part.warehouseId },
            transaction,
            lock: transaction ? transaction.LOCK.UPDATE : undefined,
        });
        if (!row) continue;
        const dec = Math.min(part.qty, row.reserved || 0);
        if (dec > 0) {
            await row.decrement('reserved', { by: dec, transaction });
        }
    }
}

async function commitReservation(parts, productId, transaction) {
    for (const part of parts) {
        await ProductWarehouseStock.increment(
            { quantity: -part.qty, reserved: -part.qty },
            { where: { productId, warehouseId: part.warehouseId }, transaction }
        );
    }
}

module.exports = {
    getOrCreateDefaultWarehouse,
    migrateLegacyStockToWarehouses,
    getAvailableStock,
    syncProductStockField,
    ensureProductWarehouseRows,
    setMainWarehouseQuantity,
    allocateFromWarehouses,
    applyReservation,
    releaseReservation,
    commitReservation,
};
