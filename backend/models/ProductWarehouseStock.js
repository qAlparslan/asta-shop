const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Depo başına ürün stoğu.
 * quantity: fiziksel adet
 * reserved: ödeme bekleyen siparişler için ayrılmış adet (satılabilir = quantity - reserved)
 */
const ProductWarehouseStock = sequelize.define(
    'ProductWarehouseStock',
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
        warehouseId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0 },
        },
        reserved: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0 },
        },
    },
    {
        tableName: 'product_warehouse_stocks',
        timestamps: true,
        indexes: [
            { unique: true, name: 'pws_product_warehouse_unique', fields: ['productId', 'warehouseId'] },
            { name: 'pws_product_idx', fields: ['productId'] },
        ],
    }
);

const Warehouse = require('./Warehouse');
ProductWarehouseStock.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });

module.exports = ProductWarehouseStock;
