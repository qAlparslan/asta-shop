const sequelize = require('../config/database');

/** Sipariş durumuna odeme_bekleniyor ekler (MySQL ENUM). */
async function ensureOrderStatusEnum() {
    try {
        await sequelize.query(`
            ALTER TABLE \`orders\` MODIFY COLUMN \`status\` 
            ENUM('odeme_bekleniyor','hazirlaniyor','kargolandi','teslim-edildi','iptal-edildi') 
            NOT NULL DEFAULT 'hazirlaniyor'
        `);
        console.log('   ➕ orders.status ENUM güncellendi (odeme_bekleniyor).');
    } catch (err) {
        if (/Unknown column|doesn't exist|no such table/i.test(err.message)) return;
        if (/Duplicate|same|identical/i.test(err.message)) return;
        console.warn('   ⚠️ orders.status ENUM:', err.message);
    }
}

module.exports = ensureOrderStatusEnum;
