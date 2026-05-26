const sequelize = require('../config/database');

/**
 * E-fatura / e-arşiv talebi için `orders` tablosuna idempotent kolonlar.
 */
async function ensureOrderEInvoiceColumns() {
    const tableName = 'orders';
    /** @type {{ name: string; ddl: string }[]} */
    const columns = [
        {
            name: 'wantsElectronicInvoice',
            ddl: 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `trackingNumber`',
        },
        { name: 'invoiceTaxNumber', ddl: 'VARCHAR(15) NULL DEFAULT NULL' },
        { name: 'invoiceCompanyTitle', ddl: 'VARCHAR(254) NULL DEFAULT NULL' },
        { name: 'invoiceTaxOffice', ddl: 'VARCHAR(160) NULL DEFAULT NULL' },
        {
            name: 'eInvoiceStatus',
            ddl: `VARCHAR(40) NOT NULL DEFAULT 'none'`,
        },
        { name: 'eInvoiceIntegrationRef', ddl: 'VARCHAR(160) NULL DEFAULT NULL' },
        { name: 'eInvoiceLastError', ddl: 'TEXT NULL' },
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

module.exports = ensureOrderEInvoiceColumns;
