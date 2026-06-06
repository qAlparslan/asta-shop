const sequelize = require('../config/database');

async function ensureProductReviewImagesColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE \`product_reviews\`
            ADD COLUMN \`images\` JSON NULL
            COMMENT 'Yorum fotoğrafları (/uploads/reviews/...)'
            AFTER \`body\`
        `);
        console.log('   ➕ product_reviews.images kolonu eklendi.');
    } catch (err) {
        const m = String(err.message || '');
        if (/Duplicate column|already exists/i.test(m)) return;
        if (/Unknown table/i.test(m)) return;
        console.warn('   ⚠️ product_reviews.images:', m);
    }
}

module.exports = ensureProductReviewImagesColumn;
