const sequelize = require('../config/database');

/** DB_SYNC_ALTER kapalıyken Sequelize yeni kolonu eklemez — idempotent ALTER */
async function ensureConsentEventTermsColumn() {
    try {
        await sequelize.query(
            'ALTER TABLE `consent_events` ADD COLUMN `termsOfUseVersion` VARCHAR(40) NULL'
        );
        console.log('   ➕ consent_events.termsOfUseVersion eklendi');
    } catch (err) {
        const code = err?.parent?.code;
        if (
            code === 'ER_DUP_FIELDNAME' ||
            /Duplicate column/i.test(String(err.message || ''))
        ) {
            return;
        }
        if (/doesn't exist|no such table/i.test(err.message || '')) {
            return;
        }
        console.warn('   ⚠️ consent_events.termsOfUseVersion:', err.message);
    }
}

module.exports = ensureConsentEventTermsColumn;
