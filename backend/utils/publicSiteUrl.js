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

/**
 * İstekten kök URL türetir — FRONTEND_PUBLIC_URL yoksa proxy Host başlığını kullanır.
 * @param {import('express').Request | null | undefined} req
 */
function resolvePublicSiteBaseFromRequest(req) {
    let base = resolvePublicSiteBase();
    if (base || !req) return base;
    const host = String(req.get('x-forwarded-host') || req.get('host') || '')
        .split(',')[0]
        .trim();
    const proto = String(req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http'))
        .split(',')[0]
        .trim();
    if (host) base = `${proto}://${host}`;
    return (base || '').replace(/\/$/, '');
}

module.exports = { resolvePublicSiteBase, resolvePublicSiteBaseFromRequest };
