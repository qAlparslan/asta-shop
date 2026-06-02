const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * İletişim sayfasındaki "Bize mesaj bırakın" formundan gelen talepler.
 * Mesaj her zaman DB'ye kaydedilir; ardından mağaza e-postasına bildirim denenir.
 * Böylece SMTP geçici sorunlu olsa bile hiçbir talep kaybolmaz.
 */
const ContactMessage = sequelize.define('ContactMessage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true },
    },
    subject: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    ipAddress: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    status: {
        // new = kaydedildi, notified = bildirim maili gitti, failed = mail gönderilemedi
        type: DataTypes.ENUM('new', 'notified', 'failed'),
        allowNull: false,
        defaultValue: 'new',
    },
}, {
    tableName: 'contact_messages',
    timestamps: true,
    indexes: [
        { name: 'contact_created_idx', fields: ['createdAt'] },
        { name: 'contact_status_idx', fields: ['status'] },
    ],
});

module.exports = ContactMessage;
