const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * SMTP / teslimat sağlayıcıdan gelen bounce, şikâyet vb. bildirimler.
 * Gönderiyi durdurmak ve listelerden düşürmek için kullanılır (idempotent kayıt).
 */
const EmailDeliveryFeedback = sequelize.define(
    'EmailDeliveryFeedback',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        recipientEmail: {
            type: DataTypes.STRING(320),
            allowNull: false,
        },
        kind: {
            type: DataTypes.STRING(40),
            allowNull: false,
            comment: 'bounce_hard | bounce_soft | complaint | drop | unsubscribed_via_provider',
        },
        provider: {
            type: DataTypes.STRING(40),
            allowNull: true,
        },
        diagnosticCode: {
            type: DataTypes.STRING(120),
            allowNull: true,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        notificationId: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        rawPayload: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    },
    {
        tableName: 'email_delivery_feedback',
        updatedAt: false,
        indexes: [
            { fields: ['recipientEmail'] },
            { fields: ['kind'] },
            { fields: ['createdAt'] },
        ],
    }
);

module.exports = EmailDeliveryFeedback;
