const sequelize = require('../config/database');

/**
 * email_logs tablosuna sonradan eklenen kolonları idempotent biçimde ekler.
 */
async function ensureEmailLogColumns() {
    const tableName = 'email_logs';
    const columns = [
        { name: 'campaignId', ddl: 'CHAR(36) NULL' },
        { name: 'variant',    ddl: 'VARCHAR(2) NULL' },
    ];

    for (const col of columns) {
        try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.ddl}`);
            console.log(`   ➕ email_logs.${col.name} kolonu eklendi`);
        } catch (err) {
            if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message)) {
                // sessizce yut
            } else if (/doesn't exist|no such table/i.test(err.message)) {
                // tablo henüz yok, sync ile birlikte yaratılacak
                return;
            } else {
                console.warn(`   ⚠️ email_logs.${col.name} eklenemedi: ${err.message}`);
            }
        }
    }

    // Index — kolonlar hazırsa ekle (idempotent)
    try {
        await sequelize.query(`CREATE INDEX \`email_logs_campaign_idx\` ON \`${tableName}\` (\`campaignId\`)`);
        console.log('   ➕ email_logs.campaignId üzerine index eklendi');
    } catch (err) {
        if (err?.parent?.code === 'ER_DUP_KEYNAME' || /Duplicate key name/i.test(err.message)) {
            // zaten var
        } else if (!/Too many keys/i.test(err.message)) {
            console.warn(`   ⚠️ email_logs.campaignId index eklenemedi: ${err.message}`);
        }
    }
}

module.exports = ensureEmailLogColumns;
