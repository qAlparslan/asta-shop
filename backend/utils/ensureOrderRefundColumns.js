const sequelize = require('../config/database');

/**
 * PayTR iade takibi — orders tablosu.
 */
async function ensureOrderRefundColumns() {
    const tableName = 'orders';
    /** @type {{ name: string; ddl: string }[]} */
    const columns = [
        {
            name: 'refundStatus',
            ddl: "VARCHAR(24) NOT NULL DEFAULT 'none' COMMENT 'none|pending|completed|failed'",
        },
        { name: 'refundedAmount', ddl: 'DECIMAL(10,2) NULL DEFAULT NULL' },
        { name: 'paytrRefundReference', ddl: 'VARCHAR(64) NULL DEFAULT NULL' },
        { name: 'refundLastError', ddl: 'TEXT NULL' },
        { name: 'refundedAt', ddl: 'DATETIME NULL DEFAULT NULL' },
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

module.exports = ensureOrderRefundColumns;
