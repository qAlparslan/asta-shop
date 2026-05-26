const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HomeHeroSlide = sequelize.define(
    'HomeHeroSlide',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        title: { type: DataTypes.STRING(200), allowNull: false },
        subtitle: { type: DataTypes.STRING(500), allowNull: false },
        ctaText: { type: DataTypes.STRING(100), allowNull: false },
        /** Dahili (/magaza) veya tam URL */
        ctaUrl: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '/magaza' },
        bgType: {
            type: DataTypes.ENUM('gradient', 'image'),
            allowNull: false,
            defaultValue: 'gradient',
        },
        /** CSS gradient ifadesi, örn linear-gradient(...) */
        bgGradient: { type: DataTypes.TEXT, allowNull: true },
        /** Göreli (/uploads/...) veya https — image modunda */
        bgImageUrl: { type: DataTypes.STRING(500), allowNull: true },
        /** Görsel modunda img alt metni */
        imageAlt: { type: DataTypes.STRING(500), allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
        tableName: 'home_hero_slides',
        indexes: [{ fields: ['sortOrder'] }, { fields: ['isActive'] }],
    }
);

module.exports = HomeHeroSlide;
