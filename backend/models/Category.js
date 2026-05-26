const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: true, len: [2, 100] },
        },
        slug: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        meta_title: {
            type: DataTypes.STRING(180),
            allowNull: true,
        },
        meta_description: {
            type: DataTypes.STRING(300),
            allowNull: true,
        },
    },
    {
        tableName: 'categories',
        timestamps: true,
        indexes: [
            { unique: true, name: 'categories_name_unique', fields: ['name'] },
            { unique: true, name: 'categories_slug_unique', fields: ['slug'] },
        ],
    }
);

module.exports = Category;
