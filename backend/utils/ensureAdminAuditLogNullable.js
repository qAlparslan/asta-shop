const sequelize = require('../config/database');

/**
 * Kullanıcı silme akışında audit kayıtlarını koruyup sadece referansı NULL'a çekebilmek için
 * `admin_audit_logs.adminUserId` kolonu nullable olmalı. Aynı şekilde `consent_events.userId`
 * zaten nullable; FK constraint'i ON DELETE SET NULL'a güncellemeye gerek yok çünkü deleteUser
 * controller'ı silme öncesi referansları manuel olarak NULL'a çekiyor.
 *
 * Idempotent: kolon zaten nullable ise sessizce geçer.
 */
async function ensureAdminAuditLogNullable() {
    const tableName = 'admin_audit_logs';
    try {
        await sequelize.query(
            `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`adminUserId\` CHAR(36) NULL DEFAULT NULL`,
        );
        console.log(`   ✏️  ${tableName}.adminUserId → NULL kabul edecek şekilde güncellendi.`);
    } catch (err) {
        // Zaten nullable veya tablo yok ise sessizce geç.
        if (/Unknown table|doesn't exist|ER_NO_SUCH_TABLE/i.test(String(err.message || ''))) return;
        // MySQL bazen "nothing to alter" tarzı uyarı verir; gerçek hata varsa logla.
        console.warn(`   ⚠️ ${tableName}.adminUserId modify:`, err.message);
    }
}

module.exports = ensureAdminAuditLogNullable;
