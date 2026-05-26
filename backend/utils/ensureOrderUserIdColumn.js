const sequelize = require('../config/database');

/**
 * Sipariş → kullanıcı ilişkisi (Siparişlerim ekranı + istatistik).
 * FK yok: bazı MySQL kurulumlarında tablo adı/uymazlık hatalarını önlemek için sadece kolon + indeks.
 */
async function ensureOrderUserIdColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE \`orders\`
            ADD COLUMN \`userId\` CHAR(36) NULL DEFAULT NULL COMMENT 'Giriş yapmış müşteri (opsiyonel)' AFTER \`email\`
        `);
        console.log('   ➕ orders.userId kolonu eklendi.');
    } catch (err) {
        if (/Duplicate column|already exists/i.test(String(err.message))) return;
        if (/Unknown table/i.test(String(err.message))) return;
        console.warn('   ⚠️ orders.userId:', err.message);
    }
    try {
        await sequelize.query(`
            CREATE INDEX \`orders_userId_idx\` ON \`orders\` (\`userId\`)
        `);
    } catch (err) {
        if (/Duplicate|already exists/i.test(String(err.message))) return;
        console.warn('   ⚠️ orders_userId_idx:', err.message);
    }
}

module.exports = ensureOrderUserIdColumn;
