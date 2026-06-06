const sequelize = require('../config/database');

async function ensureProductCartHoldTable() {
    try {
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS \`product_cart_holds\` (
                \`id\` CHAR(36) NOT NULL,
                \`productId\` CHAR(36) NOT NULL,
                \`holderKey\` VARCHAR(80) NOT NULL,
                \`userId\` CHAR(36) NULL,
                \`sessionId\` VARCHAR(64) NULL,
                \`email\` VARCHAR(255) NULL,
                \`variantId\` VARCHAR(64) NULL,
                \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
                \`lastAddedAt\` DATETIME NOT NULL,
                \`notifiedDiscountPercent\` INT NULL,
                \`createdAt\` DATETIME NOT NULL,
                \`updatedAt\` DATETIME NOT NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`uniq_product_cart_holder\` (\`productId\`, \`holderKey\`),
                KEY \`idx_cart_hold_product_active\` (\`productId\`, \`isActive\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('   ✓ product_cart_holds tablosu hazır.');
    } catch (err) {
        console.warn('   ⚠️ product_cart_holds:', err.message || err);
    }
}

module.exports = ensureProductCartHoldTable;
