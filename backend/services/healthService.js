const sequelize = require('../config/database');
const { getMailTransportMode, verifySmtpConnection, getFrontendUrl, getBackendPublicUrl } = require('./mailer');

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
        return { ...base, status: 'ok', database: 'connected' };
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
