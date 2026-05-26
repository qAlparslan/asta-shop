const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteSetting = sequelize.define(
    'SiteSetting',
    {
        key: {
            type: DataTypes.STRING(100),
            primaryKey: true,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'string', // string | number | boolean
        },
    },
    {
        tableName: 'site_settings',
        timestamps: true,
    }
);

module.exports = SiteSetting;
