const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Admin panelinden yönetilen otomatik e-posta kuralı (drip / yaşam döngüsü maili).
 *
 * triggerType:
 *   days_after_signup_no_order → kayıttan triggerDays gün sonra, hiç sipariş vermemişlere
 *   days_after_last_order      → son siparişten triggerDays gün sonra (geri kazanım)
 *
 * repeatMode:
 *   once      → her kullanıcıya bu kuraldan en fazla 1 kez
 *   recurring → repeatDays günde bir tekrar (kişi başına soğuma süresi)
 *
 * startAt / endAt: kuralın aktif olduğu tarih penceresi (boş = sınırsız).
 */
const EmailAutomation = sequelize.define('EmailAutomation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    triggerType: {
        type: DataTypes.ENUM('days_after_signup_no_order', 'days_after_last_order'),
        allowNull: false,
        defaultValue: 'days_after_signup_no_order',
    },
    triggerDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    bodyHtml: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    ctaText: {
        type: DataTypes.STRING(120),
        allowNull: true,
    },
    ctaPath: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: '/urunler',
    },
    repeatMode: {
        type: DataTypes.ENUM('once', 'recurring'),
        allowNull: false,
        defaultValue: 'once',
    },
    repeatDays: {
        // recurring modda kişi başına minimum tekrar aralığı (gün)
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 30,
    },
    startAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    endAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastRunAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastSentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'email_automations',
    timestamps: true,
    indexes: [
        { name: 'email_automations_enabled_idx', fields: ['enabled'] },
    ],
});

module.exports = EmailAutomation;
