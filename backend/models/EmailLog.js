const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Tüm e-posta gönderim denemelerinin kaydı.
 * Admin panelinde "Mail Geçmişi" sekmesinde gösterilir.
 */
const EmailLog = sequelize.define('EmailLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    toAddress: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    type: {
        // welcome | orderConfirmation | adminNewOrder | orderStatusUpdate |
        // passwordReset | newsletterConfirm | campaign | generic
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'generic',
    },
    status: {
        // success | failed
        type: DataTypes.ENUM('success', 'failed'),
        allowNull: false,
        defaultValue: 'success',
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    previewUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    relatedId: {
        // Kampanya id / sipariş id / kullanıcı id gibi referans
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    campaignId: {
        // Eğer kampanya kaynaklıysa Campaign.id
        type: DataTypes.UUID,
        allowNull: true,
    },
    variant: {
        // A/B test için 'A' veya 'B'
        type: DataTypes.STRING(2),
        allowNull: true,
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    tableName: 'email_logs',
    timestamps: true,
    indexes: [
        { name: 'email_logs_type_idx', fields: ['type'] },
        { name: 'email_logs_status_idx', fields: ['status'] },
        { name: 'email_logs_created_idx', fields: ['createdAt'] },
        // campaignId index'i ensureEmailLogColumns içinde idempotent olarak ekleniyor
    ],
});

module.exports = EmailLog;
