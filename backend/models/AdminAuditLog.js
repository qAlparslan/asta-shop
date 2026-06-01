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
        // Audit kaydı kalıcıdır; kullanıcı silindiğinde sadece referans NULL'a çekilir
        // (delete user akışı önce buradaki adminUserId'yi NULL yapar, sonra user'ı siler).
        adminUserId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL',
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
