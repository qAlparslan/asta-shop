const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Kampanya modeli.
 *
 * status akışı:
 *   draft       → henüz gönderilmedi/zamanlanmadı (taslak)
 *   scheduled   → scheduledAt zamanında otomatik gönderilecek
 *   sending     → şu anda gönderiliyor (cron tarafından)
 *   sent        → gönderim tamamlandı
 *   cancelled   → iptal edildi
 *   failed      → gönderim sırasında genel hata
 *
 * type:
 *   manual         → admin elle gönderdi/zamanladı
 *   automated      → cron'un üretip gönderdiği (örn. dormant user)
 */
const Campaign = sequelize.define('Campaign', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
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
    ctaUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    audience: {
        // all_consenting | newsletter | both | all_users
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'all_consenting',
    },
    status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'),
        allowNull: false,
        defaultValue: 'draft',
    },
    type: {
        type: DataTypes.ENUM('manual', 'automated'),
        allowNull: false,
        defaultValue: 'manual',
    },
    automatedRule: {
        // 'dormant_no_order' | 'reactivation_30d' | 'welcome_followup_7d' vb.
        type: DataTypes.STRING(60),
        allowNull: true,
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    // ── Hedef sayıları
    totalRecipients: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sentCount:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failedCount:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // ── İlişkili kupon
    couponId: {
        type: DataTypes.UUID,
        allowNull: true,
    },

    // ── A/B test
    abTestEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    variantBTitle: { type: DataTypes.STRING(500), allowNull: true },
    variantBBodyHtml: { type: DataTypes.TEXT('long'), allowNull: true },
    abSplitPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 }, // A için %
    // İstatistik
    variantASent:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    variantAFailed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    variantBSent:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    variantBFailed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // ── Genişletme
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    tableName: 'campaigns',
    timestamps: true,
    indexes: [
        { name: 'campaigns_status_idx', fields: ['status'] },
        { name: 'campaigns_scheduled_idx', fields: ['scheduledAt'] },
        { name: 'campaigns_type_idx', fields: ['type'] },
    ],
});

module.exports = Campaign;
