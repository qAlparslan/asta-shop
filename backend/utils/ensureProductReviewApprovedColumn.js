const sequelize = require('../config/database');

/**
 * Ürün yorumları — moderasyon (vitrinte yalnızca onaylılar).
 * Varsayılan 1: ALTER ile eklenen kolonda mevcut satırlar görünür kalır;
 * yeni yorumlar Sequelize tarafında approved: false ile oluşturulur.
 */
async function ensureProductReviewApprovedColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE \`product_reviews\`
            ADD COLUMN \`approved\` TINYINT(1) NOT NULL DEFAULT 1
            COMMENT '1=onaylı (vitinde), 0=beklemede/reddedilmiş'
            AFTER \`body\`
        `);
        console.log('   ➕ product_reviews.approved kolonu eklendi.');
    } catch (err) {
        const m = String(err.message || '');
        if (/Duplicate column|already exists/i.test(m)) return;
        if (/Unknown table/i.test(m)) return;
        console.warn('   ⚠️ product_reviews.approved:', m);
    }
}

module.exports = ensureProductReviewApprovedColumn;
