const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Warehouse = sequelize.define(
    'Warehouse',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(32),
            allowNull: false,
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: 'warehouses',
        timestamps: true,
        indexes: [{ unique: true, name: 'warehouses_code_unique', fields: ['code'] }],
    }
);

module.exports = Warehouse;
