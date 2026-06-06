const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductQuestion = sequelize.define(
    'ProductQuestion',
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
            allowNull: false,
        },
        authorName: {
            type: DataTypes.STRING(120),
            allowNull: false,
        },
        question: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        answer: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        answeredAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        answeredByUserId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
    },
    {
        tableName: 'product_questions',
        indexes: [
            { fields: ['productId'], name: 'idx_product_questions_product' },
            { fields: ['userId'], name: 'idx_product_questions_user' },
        ],
    },
);

module.exports = ProductQuestion;
