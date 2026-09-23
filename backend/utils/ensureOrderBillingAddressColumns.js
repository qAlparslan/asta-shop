const sequelize = require('../config/database');

/**
 * Teslimat / fatura adresi ayrımı için `orders` kolonları (idempotent).
 */
async function ensureOrderBillingAddressColumns() {
    const tableName = 'orders';
    /** @type {{ name: string; ddl: string }[]} */
    const columns = [
        { name: 'shippingProvince', ddl: 'VARCHAR(80) NULL DEFAULT NULL AFTER `address`' },
        { name: 'shippingDistrict', ddl: 'VARCHAR(80) NULL DEFAULT NULL' },
        {
            name: 'billingSameAsShipping',
            ddl: 'TINYINT(1) NOT NULL DEFAULT 1',
        },
        { name: 'billingAddress', ddl: 'TEXT NULL' },
        { name: 'billingProvince', ddl: 'VARCHAR(80) NULL DEFAULT NULL' },
        { name: 'billingDistrict', ddl: 'VARCHAR(80) NULL DEFAULT NULL' },
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

module.exports = ensureOrderBillingAddressColumns;
