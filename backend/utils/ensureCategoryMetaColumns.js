const sequelize = require('../config/database');

const COLS = [
    { name: 'meta_title', ddl: 'VARCHAR(180) NULL' },
    { name: 'meta_description', ddl: 'VARCHAR(300) NULL' },
];

async function ensureCategoryMetaColumns() {
    const table = 'categories';
    for (const col of COLS) {
        try {
            await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.ddl}`);
            console.log(`   ➕ categories.${col.name} eklendi`);
        } catch (err) {
            if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message)) {
                // skip
            } else if (/doesn't exist|no such table/i.test(err.message)) {
                return;
            } else {
                console.warn(`   ⚠️ categories.${col.name}:`, err.message);
            }
        }
    }
}

module.exports = ensureCategoryMetaColumns;
