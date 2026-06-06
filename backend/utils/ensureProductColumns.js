/**
 * products tablosunda modele göre eksik sütunları idempotent ekler.
 * Eski veritabanlarında tablo sync ile oluşmuş ama yeni alanlar DB_SYNC_ALTER=false
 * yüzünden eklenmemiş olabilir.
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

async function ensureProductColumns() {
    const additions = [
        { name: 'brand', sql: 'ALTER TABLE `products` ADD COLUMN `brand` VARCHAR(100) NULL' },
        { name: 'category', sql: 'ALTER TABLE `products` ADD COLUMN `category` VARCHAR(100) NULL' },
        { name: 'original_price', sql: 'ALTER TABLE `products` ADD COLUMN `original_price` DECIMAL(10,2) NULL' },
        {
            name: 'discountStartsAt',
            sql: 'ALTER TABLE `products` ADD COLUMN `discountStartsAt` DATETIME NULL',
        },
        {
            name: 'discountExpiresAt',
            sql: 'ALTER TABLE `products` ADD COLUMN `discountExpiresAt` DATETIME NULL',
        },
        { name: 'discountPercent', sql: 'ALTER TABLE `products` ADD COLUMN `discountPercent` INT NULL' },
        {
            name: 'area',
            sql: "ALTER TABLE `products` ADD COLUMN `area` ENUM('yuz','vucut','goz','el','genel') NOT NULL DEFAULT 'genel'",
        },
        {
            name: 'purpose',
            sql: "ALTER TABLE `products` ADD COLUMN `purpose` ENUM('temizleyici','nemlendirici','anti-aging','onarici','diger') NOT NULL DEFAULT 'diger'",
        },
        {
            name: 'skin_type',
            sql: "ALTER TABLE `products` ADD COLUMN `skin_type` ENUM('hassas','kuru','yagli_karma','olgun','tumu') NOT NULL DEFAULT 'tumu'",
        },
        {
            name: 'tag',
            sql: "ALTER TABLE `products` ADD COLUMN `tag` VARCHAR(255) NULL DEFAULT 'yok'",
        },
        { name: 'variants', sql: 'ALTER TABLE `products` ADD COLUMN `variants` JSON NULL' },
        { name: 'slug', sql: 'ALTER TABLE `products` ADD COLUMN `slug` VARCHAR(255) NULL' },
        { name: 'meta_title', sql: 'ALTER TABLE `products` ADD COLUMN `meta_title` VARCHAR(255) NULL' },
        { name: 'meta_description', sql: 'ALTER TABLE `products` ADD COLUMN `meta_description` TEXT NULL' },
        { name: 'images', sql: 'ALTER TABLE `products` ADD COLUMN `images` JSON NULL' },
        {
            name: 'is_active',
            sql: 'ALTER TABLE `products` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1',
        },
        { name: 'vatRate', sql: 'ALTER TABLE `products` ADD COLUMN `vatRate` INT NULL' },
        { name: 'barcode', sql: 'ALTER TABLE `products` ADD COLUMN `barcode` VARCHAR(64) NULL' },
        {
            name: 'autoHiddenOutOfStock',
            sql: 'ALTER TABLE `products` ADD COLUMN `autoHiddenOutOfStock` TINYINT(1) NOT NULL DEFAULT 0',
        },
        { name: 'deletedAt', sql: 'ALTER TABLE `products` ADD COLUMN `deletedAt` DATETIME NULL' },
        {
            name: 'cartAddCount',
            sql: 'ALTER TABLE `products` ADD COLUMN `cartAddCount` INT NOT NULL DEFAULT 0',
        },
    ];

    for (const a of additions) {
        if (!(await columnExists('products', a.name))) {
            console.log(`📦 products tablosuna "${a.name}" sütunu ekleniyor…`);
            try {
                await sequelize.query(a.sql);
            } catch (err) {
                const msg = String(err.message || err);
                if (/doesn't exist|ER_NO_SUCH_TABLE|1146/i.test(msg)) {
                    console.warn(
                        '📦 products tablosu henüz yok — sequelize.sync önce çalıştırılmalı.'
                    );
                    return;
                }
                throw err;
            }
        }
    }
}

module.exports = ensureProductColumns;
