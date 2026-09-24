const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Order = require('../models/Order');
const { legacyOrderNumberFromUuid, randomNumericOrderNumber } = require('./orderNumber');

async function ensureOrderNumberColumn() {
    const tableName = 'orders';
    try {
        await sequelize.query(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`orderNumber\` VARCHAR(11) NULL DEFAULT NULL AFTER \`id\``,
        );
        console.log(`   ➕ ${tableName}.orderNumber kolonu eklendi.`);
    } catch (err) {
        if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message || '')) {
            /* ok */
        } else if (!/Unknown table/i.test(String(err.message || ''))) {
            console.warn(`   ⚠️ ${tableName}.orderNumber:`, err.message);
        }
    }

    try {
        await sequelize.query(
            `CREATE UNIQUE INDEX \`orders_orderNumber_unique\` ON \`${tableName}\` (\`orderNumber\`)`,
        );
        console.log('   ➕ orders.orderNumber unique index eklendi.');
    } catch (err) {
        if (!/Duplicate key name|already exists/i.test(String(err.message || ''))) {
            console.warn('   ⚠️ orders.orderNumber index:', err.message);
        }
    }

    const missing = await Order.findAll({
        where: { [Op.or]: [{ orderNumber: null }, { orderNumber: '' }] },
        attributes: ['id'],
        raw: true,
    });

    for (const row of missing) {
        let num = legacyOrderNumberFromUuid(row.id);
        for (let i = 0; i < 20; i += 1) {
            const clash = await Order.findOne({ where: { orderNumber: num }, attributes: ['id'], raw: true });
            if (!clash || clash.id === row.id) break;
            num = randomNumericOrderNumber();
        }
        await Order.update({ orderNumber: num }, { where: { id: row.id } });
    }

    if (missing.length) {
        console.log(`   ✓ ${missing.length} siparişe orderNumber atandı.`);
    }
}

module.exports = ensureOrderNumberColumn;
