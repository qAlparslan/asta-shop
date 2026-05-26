const sequelize = require('../config/database');

/**
 * `home_hero_slides` tablosuna storefront/admin hero alanlarını idempotent ekler.
 */
async function ensureHomeHeroColumns() {
    const tableName = 'home_hero_slides';
    const columns = [{ name: 'imageAlt', ddl: 'VARCHAR(500) NULL' }];

    for (const col of columns) {
        try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.ddl}`);
            console.log(`   ➕ ${tableName}.${col.name} kolonu eklendi`);
        } catch (err) {
            if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message)) {
                // sessizce yut
            } else {
                console.warn(`   ⚠️ ${tableName}.${col.name} eklenemedi: ${err.message}`);
            }
        }
    }
}

module.exports = ensureHomeHeroColumns;
