/**
 * Sentry (v8): NODE_ENV + SENTRY_DSN tanımlıysa yükle.
 * @see https://docs.sentry.io/platforms/javascript/guides/express/
 */

let initialized = false;

function initSdk() {
    if (!process.env.SENTRY_DSN || initialized) {
        return false;
    }
    try {
        // eslint-disable-next-line global-require
        const Sentry = require('@sentry/node');
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            sendDefaultPii: false,
            integrations: [Sentry.expressIntegration()],
        });
        initialized = true;
        return true;
    } catch (e) {
        console.warn('[Ops] Sentry başlatılamadı:', e.message);
        initialized = true;
        return false;
    }
}

/** Tüm route'lardan önce çağırın (OpenTelemetry enstrümantasyonu). */
function setupRequestHandler() {
    initSdk();
}

/**
 * Tüm route ve controller'lardan sonra; diğer error middleware'lerden önce.
 * @param {import('express').Application} app
 */
function setupErrorHandler(app) {
    if (!process.env.SENTRY_DSN) return;
    try {
        // eslint-disable-next-line global-require
        const Sentry = require('@sentry/node');
        Sentry.setupExpressErrorHandler(app);
    } catch (e) {
        console.warn('[Sentry] Express error handler eklenemedi:', e.message);
    }
}

module.exports = {
    setupRequestHandler,
    setupErrorHandler,
};
