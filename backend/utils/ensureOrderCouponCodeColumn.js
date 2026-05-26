const sequelize = require('../config/database');

/** Siparişe uygulanan kupon kodu (ödeme sepeti + raporlama için). */
async function ensureOrderCouponCodeColumn() {
    const tableName = 'orders';
    const name = 'couponCode';
    const ddl = 'VARCHAR(64) NULL DEFAULT NULL';
    try {
        await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name}\` ${ddl}`);
        console.log(`   ➕ ${tableName}.${name} kolonu eklendi.`);
    } catch (err) {
        if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message || '')) {
            return;
        }
        if (/Unknown table/i.test(String(err.message || ''))) return;
        console.warn(`   ⚠️ ${tableName}.${name}:`, err.message);
    }
}

module.exports = ensureOrderCouponCodeColumn;
