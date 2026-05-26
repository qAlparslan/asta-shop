const { QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const { logAdminAudit } = require('../services/auditService');

const ALLOWED_ROLES = ['admin', 'customer'];

/**
 * Kayıtlı kullanıcılar + her birinin sipariş istatistikleri (admin yönetim listesi).
 * Sipariş tablosuyla e-posta üzerinden LEFT JOIN yapılır; hiç sipariş vermemiş kullanıcı da listede görünür.
 */
exports.listUsers = async (req, res) => {
    try {
        const rows = await sequelize.query(
            `
            SELECT
                u.id,
                u.fullName,
                u.email,
                u.role,
                u.createdAt AS registeredAt,
                u.updatedAt,
                COALESCE(o.orderCount, 0) AS orderCount,
                COALESCE(o.totalSpent, 0) AS totalSpent,
                o.lastOrderAt
            FROM users u
            LEFT JOIN (
                SELECT email,
                       COUNT(*) AS orderCount,
                       SUM(totalAmount) AS totalSpent,
                       MAX(createdAt) AS lastOrderAt
                FROM orders
                GROUP BY email
            ) o ON o.email = u.email
            ORDER BY u.createdAt DESC
            `,
            { type: QueryTypes.SELECT }
        );

        const users = rows.map((r) => ({
            id: r.id,
            fullName: r.fullName,
            email: r.email,
            role: r.role,
            registeredAt: r.registeredAt,
            updatedAt: r.updatedAt,
            orderCount: Number(r.orderCount) || 0,
            totalSpent: Number(r.totalSpent || 0),
            lastOrderAt: r.lastOrderAt,
        }));

        res.status(200).json({ status: 'success', data: { users } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/**
 * Kullanıcı rolünü güncelle (admin <-> customer).
 * Kendine "downgrade" yapmaya çalışan adminleri ve son admini koru.
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz rol.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Kullanıcı bulunamadı.' });
        }

        if (req.user.id === user.id && role !== 'admin') {
            return res.status(400).json({
                status: 'fail',
                message: 'Kendi admin rolünüzü düşüremezsiniz. Başka bir admin yapsın.',
            });
        }

        if (user.role === 'admin' && role !== 'admin') {
            const otherAdmins = await User.count({ where: { role: 'admin' } });
            if (otherAdmins <= 1) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Sistemdeki son admin rolü düşürülemez.',
                });
            }
        }

        const prevRole = user.role;
        await user.update({ role });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'user.role_change',
            entityType: 'user',
            entityId: user.id,
            meta: {
                email: user.email,
                roleFrom: prevRole,
                roleTo: role,
            },
        });
        res.status(200).json({
            status: 'success',
            message: 'Kullanıcı rolü güncellendi.',
            data: {
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/**
 * Kullanıcı sil. Kendi hesabını ve son admini silmeyi engelle.
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ status: 'fail', message: 'Kullanıcı bulunamadı.' });
        }

        if (req.user.id === user.id) {
            return res.status(400).json({ status: 'fail', message: 'Kendi hesabınızı silemezsiniz.' });
        }

        if (user.role === 'admin') {
            const otherAdmins = await User.count({ where: { role: 'admin' } });
            if (otherAdmins <= 1) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Sistemdeki son admin silinemez.',
                });
            }
        }

        const snapshot = { email: user.email, role: user.role };

        await user.destroy();

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'user.delete',
            entityType: 'user',
            entityId: id,
            meta: snapshot,
        });
        res.status(200).json({ status: 'success', message: 'Kullanıcı silindi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
