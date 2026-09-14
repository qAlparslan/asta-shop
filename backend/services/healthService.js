const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const { uploadsRoot } = require('../utils/uploadsPath');
const { getMailTransportMode, verifySmtpConnection, getFrontendUrl, getBackendPublicUrl } = require('./mailer');

function uploadsSnapshot() {
    let writable = false;
    let fileCount = 0;
    try {
        fs.accessSync(uploadsRoot, fs.constants.W_OK);
        writable = true;
        const names = fs.readdirSync(uploadsRoot);
        fileCount = names.filter((n) => {
            try {
                return fs.statSync(path.join(uploadsRoot, n)).isFile();
            } catch {
                return false;
            }
        }).length;
    } catch {
        writable = false;
    }
    return { dir: uploadsRoot, writable, topLevelFileCount: fileCount };
}

/**
 * Kubernetes / load balancer için hafif canlılık (DB yok).
 */
function getLiveness() {
    return {
        status: 'ok',
        uptime: process.uptime(),
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    };
}

/**
 * Uygulama trafiği almaya hazır mı (DB ping).
 */
async function getReadiness() {
    const base = getLiveness();
    try {
        await sequelize.authenticate();
        const uploads = uploadsSnapshot();
        return {
            ...base,
            status: uploads.writable ? 'ok' : 'degraded',
            database: 'connected',
            uploads,
            mediaRoute: true,
        };
    } catch (err) {
        return {
            ...base,
            status: 'degraded',
            database: 'disconnected',
            databaseError: err.message,
        };
    }
}

/**
 * Operasyon paneli — SMTP modu, URL yapılandırması (gizli bilgi yok).
 */
async function getDetailedHealth() {
    const liveness = getLiveness();
    const readiness = await getReadiness();
    const smtp = await verifySmtpConnection();
    const mailFrom =
        process.env.MAIL_FROM_ADDRESS ||
        process.env.SMTP_USER ||
        '(varsayılan)';
    return {
        ...liveness,
        status: readiness.database === 'connected' && smtp.ok ? 'ok' : 'degraded',
        database: readiness.database,
        ...(readiness.databaseError ? { databaseError: readiness.databaseError } : {}),
        mail: {
            transportMode: getMailTransportMode(),
            smtpConfigured: Boolean(process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim()),
            verify: smtp,
            fromConfigured: Boolean(mailFrom && mailFrom !== '(varsayılan)'),
            adminNotificationEmail: Boolean(
                (process.env.ADMIN_NOTIFICATION_EMAIL || '').trim(),
            ),
        },
        urls: {
            frontendPublicUrl: getFrontendUrl() || null,
            backendPublicUrl: getBackendPublicUrl() || null,
        },
        paytr: {
            configured: Boolean(
                process.env.PAYTR_MERCHANT_ID &&
                    process.env.PAYTR_MERCHANT_KEY &&
                    process.env.PAYTR_MERCHANT_SALT,
            ),
        },
    };
}

module.exports = {
    getLiveness,
    getReadiness,
    getDetailedHealth,
};
