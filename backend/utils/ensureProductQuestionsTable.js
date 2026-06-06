const sequelize = require('../config/database');

async function ensureProductQuestionsTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS \`product_questions\` (
                \`id\` CHAR(36) NOT NULL,
                \`productId\` CHAR(36) NOT NULL,
                \`userId\` CHAR(36) NOT NULL,
                \`authorName\` VARCHAR(120) NOT NULL,
                \`question\` TEXT NOT NULL,
                \`answer\` TEXT NULL,
                \`answeredAt\` DATETIME NULL,
                \`answeredByUserId\` CHAR(36) NULL,
                \`createdAt\` DATETIME NOT NULL,
                \`updatedAt\` DATETIME NOT NULL,
                PRIMARY KEY (\`id\`),
                KEY \`idx_product_questions_product\` (\`productId\`),
                KEY \`idx_product_questions_user\` (\`userId\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✓ product_questions tablosu hazır.');
    } catch (err) {
        const m = String(err.message || '');
        if (/already exists/i.test(m)) return;
        console.warn('   ⚠️ product_questions:', m);
    }
}

module.exports = ensureProductQuestionsTable;
