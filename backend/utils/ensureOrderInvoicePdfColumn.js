const sequelize = require('../config/database');

async function ensureOrderInvoicePdfColumn() {
    const tableName = 'orders';
    try {
        await sequelize.query(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`invoicePdfPath\` VARCHAR(512) NULL DEFAULT NULL AFTER \`eInvoiceLastError\``,
        );
        console.log(`   ➕ ${tableName}.invoicePdfPath kolonu eklendi.`);
    } catch (err) {
        if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message || '')) {
            return;
        }
        if (!/Unknown table/i.test(String(err.message || ''))) {
            console.warn(`   ⚠️ ${tableName}.invoicePdfPath:`, err.message);
        }
    }
}

module.exports = ensureOrderInvoicePdfColumn;
