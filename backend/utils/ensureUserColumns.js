const sequelize = require('../config/database');

/**
 * `users` tablosunda mail/şifre sıfırlama için gerekli yeni kolonları
 * idempotent biçimde ekler. ALTER TABLE bloklarını birer birer dener;
 * "Duplicate column" hatasını sessizce yutar (zaten var).
 */
async function ensureUserColumns() {
    const tableName = 'users';
    const columns = [
        { name: 'marketingConsent',        ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
        { name: 'marketingConsentAt',      ddl: 'DATETIME NULL' },
        { name: 'emailConsentOffers', ddl: 'TINYINT(1) NULL' },
        { name: 'emailConsentNewsletter', ddl: 'TINYINT(1) NULL' },
        { name: 'resetPasswordToken',      ddl: 'VARCHAR(64) NULL' },
        { name: 'resetPasswordExpiresAt',  ddl: 'DATETIME NULL' },
        { name: 'unsubscribeToken',        ddl: 'VARCHAR(64) NULL' },
    ];

    for (const col of columns) {
        try {
            await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.ddl}`);
            console.log(`   ➕ users.${col.name} kolonu eklendi`);
        } catch (err) {
            if (err?.parent?.code === 'ER_DUP_FIELDNAME' || /Duplicate column/i.test(err.message)) {
                // sessizce yut
            } else {
                console.warn(`   ⚠️ users.${col.name} eklenemedi: ${err.message}`);
            }
        }
    }

    try {
        await sequelize.query(`
            UPDATE \`${tableName}\` SET
                emailConsentOffers = CASE
                    WHEN emailConsentOffers IS NULL THEN COALESCE(marketingConsent, 0)
                    ELSE emailConsentOffers END,
                emailConsentNewsletter = CASE
                    WHEN emailConsentNewsletter IS NULL THEN COALESCE(marketingConsent, 0)
                    ELSE emailConsentNewsletter END
        `);
    } catch (e) {
        console.warn(`   ⚠️ users prefs backfill skipped: ${e.message}`);
    }
}

module.exports = ensureUserColumns;
