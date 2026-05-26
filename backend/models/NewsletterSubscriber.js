const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Kayıtlı kullanıcı olmadan e-posta listesine katılan ziyaretçiler.
 * Double opt-in: önce 'pending', mail link tıklanınca 'active'.
 */
const NewsletterSubscriber = sequelize.define('NewsletterSubscriber', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { isEmail: true },
    },
    status: {
        // pending = onay maili yollandı, henüz tıklanmadı
        // active  = onaylı abone
        // unsubscribed = aboneliği iptal etti
        type: DataTypes.ENUM('pending', 'active', 'unsubscribed'),
        allowNull: false,
        defaultValue: 'pending',
    },
    confirmToken: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    unsubscribeToken: {
        type: DataTypes.STRING(64),
        allowNull: false,
    },
    confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    unsubscribedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'footer',
    },
}, {
    tableName: 'newsletter_subscribers',
    timestamps: true,
    indexes: [
        { unique: true, name: 'newsletter_email_unique', fields: ['email'] },
        { name: 'newsletter_status_idx', fields: ['status'] },
    ],
});

module.exports = NewsletterSubscriber;
