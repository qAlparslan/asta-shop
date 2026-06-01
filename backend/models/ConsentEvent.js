const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/** Açık rıza / bilgilendirme kabul kayıtları — versiyon + toplama yöntemi ile kanıtlanabilir */
const ConsentEvent = sequelize.define(
    'ConsentEvent',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL',
        },
        visitorKey: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        channel: {
            type: DataTypes.ENUM('registration', 'cookie_banner', 'account_settings', 'api'),
            allowNull: false,
        },
        privacyVersion: { type: DataTypes.STRING(40), allowNull: false },
        kvkkVersion: { type: DataTypes.STRING(40), allowNull: false },
        cookiePolicyVersion: { type: DataTypes.STRING(40), allowNull: true },
        termsOfUseVersion: { type: DataTypes.STRING(40), allowNull: true },
        marketingAccepted: { type: DataTypes.BOOLEAN, allowNull: true },
        cookiePreferences: { type: DataTypes.JSON, allowNull: true },
        /** Örn: register_form_checkbox, cookie_banner_accept_all */
        collectionMethod: { type: DataTypes.STRING(100), allowNull: false },
        userAgent: { type: DataTypes.TEXT, allowNull: true },
        ipHash: { type: DataTypes.STRING(64), allowNull: true },
    },
    {
        tableName: 'consent_events',
        updatedAt: false,
        indexes: [
            { fields: ['userId'] },
            { fields: ['visitorKey'] },
            { fields: ['createdAt'] },
        ],
    }
);

module.exports = ConsentEvent;
