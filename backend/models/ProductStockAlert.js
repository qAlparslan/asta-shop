const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductStockAlert = sequelize.define(
    'ProductStockAlert',
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
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
    },
    {
        tableName: 'product_stock_alerts',
        indexes: [
            {
                unique: true,
                fields: ['productId', 'email'],
                name: 'uniq_stock_alert_product_email',
            },
        ],
    }
);

module.exports = ProductStockAlert;
