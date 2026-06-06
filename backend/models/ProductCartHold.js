const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductCartHold = sequelize.define(
    'ProductCartHold',
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
        holderKey: {
            type: DataTypes.STRING(80),
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        sessionId: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        variantId: {
            type: DataTypes.STRING(64),
            allowNull: true,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        lastAddedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        notifiedDiscountPercent: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        notifiedSalePrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },
    },
    {
        tableName: 'product_cart_holds',
        indexes: [
            { unique: true, fields: ['productId', 'holderKey'], name: 'uniq_product_cart_holder' },
            { fields: ['productId', 'isActive'], name: 'idx_cart_hold_product_active' },
        ],
    },
);

module.exports = ProductCartHold;
