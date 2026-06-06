const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductReview = sequelize.define(
    'ProductReview',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        authorName: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        rating: {
            type: DataTypes.TINYINT,
            allowNull: false,
            validate: { min: 1, max: 5 },
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        approved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        notifyEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName: 'product_reviews',
        indexes: [{ fields: ['productId'], name: 'idx_product_reviews_product' }],
    }
);

module.exports = ProductReview;
