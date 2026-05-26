const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
    code: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    discountPercent: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // Eski alan — geriye dönük uyumluluk; yeni kuponlar expiresAt kullanır.
    expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    startsAt: {
        type: DataTypes.DATE,
        allowNull: true, // Boş = hemen aktif
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true, // Boş = süresiz
    },
    minOrderAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'coupons',
    indexes: [{ unique: true, name: 'coupons_code_unique', fields: ['code'] }],
    timestamps: true,
});

module.exports = Coupon;