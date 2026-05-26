const sequelize = require('../config/database');

/**
 * Kargo takibi için `orders` tablosuna idempotent kolonlar.
 */
async function ensureOrderShipmentColumns() {
    const tableName = 'orders';
    /** @type {{ name: string; ddl: string }[]} */
    const columns = [
        {
            name: 'carrier',
            ddl: "VARCHAR(20) NULL DEFAULT 'DHL' AFTER `trackingNumber`",
        },
        { name: 'shippedAt', ddl: 'DATETIME NULL DEFAULT NULL' },
        { name: 'trackingLastCheckedAt', ddl: 'DATETIME NULL DEFAULT NULL' },
        { name: 'trackingProviderStatus', ddl: 'VARCHAR(80) NULL DEFAULT NULL' },
    ];

    for (const col of columns) {
        try {
            await sequelize.query(
                `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.ddl}`,
            );
            console.log(`   ➕ ${tableName}.${col.name} kolonu eklendi.`);
        } catch (err) {
            if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message || '')) {
                continue;
            }
            if (/Unknown table/i.test(String(err.message || ''))) continue;
            console.warn(`   ⚠️ ${tableName}.${col.name}:`, err.message);
        }
    }
}

module.exports = ensureOrderShipmentColumns;
