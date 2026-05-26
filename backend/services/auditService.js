const crypto = require('crypto');
const AdminAuditLog = require('../models/AdminAuditLog');

function hashIp(ip) {
    const salt = process.env.CONSENT_IP_SALT || process.env.JWT_SECRET || 'dev-local';
    return crypto.createHmac('sha256', salt).update(String(ip || '')).digest('hex').slice(0, 48);
}

/**
 * @param {object} opts
 * @param {import('express').Request} opts.req
 * @param {import('../models/User')} opts.adminUser
 * @param {string} opts.action
 * @param {string} [opts.entityType]
 * @param {string} [opts.entityId]
 * @param {object} [opts.meta]
 */
async function logAdminAudit({ req, adminUser, action, entityType, entityId, meta }) {
    if (!adminUser?.id) return;
    try {
        const ip = req.ip || req.socket?.remoteAddress || '';
        await AdminAuditLog.create({
            adminUserId: adminUser.id,
            action,
            entityType: entityType || null,
            entityId: entityId != null ? String(entityId) : null,
            meta: meta || {},
            ipHash: hashIp(ip),
            userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
        });
    } catch (e) {
        console.warn('audit log write failed:', e.message);
    }
}

module.exports = { logAdminAudit, hashIp };
