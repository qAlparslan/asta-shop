const sequelize = require('../config/database');

/** Misafir: onaylandığında bilgilendirme e-postası (isteğe bağlı). */
async function ensureProductReviewNotifyEmailColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE \`product_reviews\`
            ADD COLUMN \`notifyEmail\` VARCHAR(255) NULL DEFAULT NULL
            COMMENT 'Misafir yorumda onay bildirimi için e-posta (opsiyonel)'
            AFTER \`approved\`
        `);
        console.log('   ➕ product_reviews.notifyEmail kolonu eklendi.');
    } catch (err) {
        const m = String(err.message || '');
        if (/Duplicate column|already exists/i.test(m)) return;
        if (/Unknown table/i.test(m)) return;
        console.warn('   ⚠️ product_reviews.notifyEmail:', m);
    }
}

module.exports = ensureProductReviewNotifyEmailColumn;
