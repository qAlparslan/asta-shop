/**
 * coupons tablosunda yeni alanları (startsAt / expiresAt / minOrderAmount)
 * sunucu açılışında idempotent şekilde ekler.
 *
 * Sebep: sequelize.sync() varsayılan olarak alter:false çalışıyor (indeks çoğalmasını önlemek için),
 * bu yüzden modele yeni alan eklendiğinde DB sütunu otomatik açılmıyor. Bu yardımcı, sürekli
 * "DB_SYNC_ALTER=true" yapmak zorunda kalmadan eksik sütunları açar.
 */
const sequelize = require('../config/database');

async function columnExists(table, column) {
    const dbName = sequelize.config.database;
    const [rows] = await sequelize.query(
        `SELECT COUNT(*) AS c
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        { replacements: [dbName, table, column] }
    );
    return Number(rows?.[0]?.c || 0) > 0;
}

async function ensureCouponColumns() {
    const additions = [
        { name: 'startsAt', sql: 'ALTER TABLE `coupons` ADD COLUMN `startsAt` DATETIME NULL' },
        { name: 'expiresAt', sql: 'ALTER TABLE `coupons` ADD COLUMN `expiresAt` DATETIME NULL' },
        {
            name: 'minOrderAmount',
            sql: 'ALTER TABLE `coupons` ADD COLUMN `minOrderAmount` DECIMAL(10,2) NULL DEFAULT 0',
        },
    ];

    for (const a of additions) {
        if (!(await columnExists('coupons', a.name))) {
            console.log(`📦 coupons tablosuna "${a.name}" sütunu ekleniyor…`);
            try {
                await sequelize.query(a.sql);
            } catch (err) {
                const msg = String(err.message || err);
                if (/doesn't exist|ER_NO_SUCH_TABLE|1146/i.test(msg)) {
                    console.warn(
                        '📦 coupons tablosu henüz yok — önce sunucu başlatma sırasında sequelize.sync tabloyu oluşturmalı.'
                    );
                    return;
                }
                throw err;
            }
        }
    }
}

module.exports = ensureCouponColumns;
