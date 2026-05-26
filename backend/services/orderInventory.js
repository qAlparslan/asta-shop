const sequelize = require('../config/database');
const Order = require('../models/Order');
const {
    releaseReservation,
    commitReservation,
    syncProductStockField,
} = require('./inventoryService');

function parseItems(order) {
    const raw = order.items;
    return typeof raw === 'string' ? JSON.parse(raw || '[]') : raw || [];
}

async function releaseOrderInventory(order, transaction) {
    const items = parseItems(order);
    for (const line of items) {
        const parts = line.warehouseAllocations || [];
        if (!parts.length || !line.id) continue;
        await releaseReservation(parts, line.id, transaction);
    }
    for (const line of items) {
        if (line.id) await syncProductStockField(line.id, transaction);
    }
}

async function commitOrderInventory(order, transaction) {
    const items = parseItems(order);
    for (const line of items) {
        const parts = line.warehouseAllocations || [];
        if (!parts.length || !line.id) continue;
        await commitReservation(parts, line.id, transaction);
    }
    for (const line of items) {
        if (line.id) await syncProductStockField(line.id, transaction);
    }
}

/** Ödeme hiç tamamlanmayan eski siparişleri iptal eder ve rezervasyonu kaldırır. */
async function cancelStalePendingOrders(maxAgeMinutes = 30) {
    const { Op } = require('sequelize');
    const deadline = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const stale = await Order.findAll({
        where: {
            status: 'odeme_bekleniyor',
            createdAt: { [Op.lt]: deadline },
        },
    });
    for (const o of stale) {
        const t = await sequelize.transaction();
        try {
            const ord = await Order.findByPk(o.id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!ord || ord.status !== 'odeme_bekleniyor') {
                await t.commit();
                continue;
            }
            await releaseOrderInventory(ord, t);
            await ord.update({ status: 'iptal-edildi' }, { transaction: t });
            await t.commit();
            console.log(`⏱️ Süresi dolan ödeme bekleyen sipariş iptal: ${ord.id}`);
        } catch (e) {
            await t.rollback();
            console.error('cancelStalePendingOrders:', e.message);
        }
    }
}

module.exports = {
    releaseOrderInventory,
    commitOrderInventory,
    cancelStalePendingOrders,
    parseItems,
};
