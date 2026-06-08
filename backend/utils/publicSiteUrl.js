const { getFrontendUrl } = require('../services/mailer');

/** Canlı site kök URL (sitemap, robots, canonical). */
function resolvePublicSiteBase() {
    let base =
        (process.env.FRONTEND_PUBLIC_URL || process.env.VITE_PUBLIC_SITE_URL || '').trim() ||
        getFrontendUrl();
    if (!base && process.env.NODE_ENV !== 'production') {
        base = 'http://localhost:3001';
    }
    return (base || '').replace(/\/$/, '');
}

module.exports = { resolvePublicSiteBase };
