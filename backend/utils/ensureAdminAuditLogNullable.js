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
        // Kolon zaten nullable mı? Öyleyse ALTER'ı hiç deneme — gereksiz ALTER, FK yüzünden
        // her açılışta "used in a foreign key constraint" uyarısı basıyordu.
        const [rows] = await sequelize.query(
            `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = '${tableName}'
               AND COLUMN_NAME = 'adminUserId'`,
        );
        // Tablo/kolon henüz yoksa (ilk kurulum) sync zaten nullable oluşturur — sessizce geç.
        if (!rows || rows.length === 0) return;
        if (String(rows[0].IS_NULLABLE).toUpperCase() === 'YES') return;

        await sequelize.query(
            `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`adminUserId\` CHAR(36) NULL DEFAULT NULL`,
        );
        console.log(`   ✏️  ${tableName}.adminUserId → NULL kabul edecek şekilde güncellendi.`);
    } catch (err) {
        // Zaten nullable veya tablo yok ise sessizce geç.
        if (/Unknown table|doesn't exist|ER_NO_SUCH_TABLE/i.test(String(err.message || ''))) return;
        // FK nedeniyle MODIFY engellenirse: kolon zaten nullable; bu uyarı zararsız, yut.
        if (/foreign key constraint/i.test(String(err.message || ''))) return;
        // Gerçek/beklenmeyen hata varsa logla.
        console.warn(`   ⚠️ ${tableName}.adminUserId modify:`, err.message);
    }
}

module.exports = ensureAdminAuditLogNullable;
