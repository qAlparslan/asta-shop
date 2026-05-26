const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminAuditLog = sequelize.define(
    'AdminAuditLog',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        adminUserId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
        },
        action: { type: DataTypes.STRING(120), allowNull: false },
        entityType: { type: DataTypes.STRING(80), allowNull: true },
        entityId: { type: DataTypes.STRING(64), allowNull: true },
        meta: { type: DataTypes.JSON, allowNull: true },
        ipHash: { type: DataTypes.STRING(64), allowNull: true },
        userAgent: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        tableName: 'admin_audit_logs',
        updatedAt: false,
        indexes: [
            { fields: ['adminUserId'] },
            { fields: ['createdAt'] },
            { fields: ['entityType', 'entityId'] },
        ],
    }
);

module.exports = AdminAuditLog;
