/**
 * Build sırasında robots.txt — Sitemap mutlaka tam (absolute) URL olmalı.
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const outPath = path.join(publicDir, 'robots.txt');
const envPath = path.join(__dirname, '..', 'backend', '.env');

/** @param {string} filePath @param {string} key */
function readEnvValue(filePath, key) {
    if (!fs.existsSync(filePath)) return '';
    const text = fs.readFileSync(filePath, 'utf8');
    const re = new RegExp(`^${key}=(.*)$`, 'm');
    const match = text.match(re);
    if (!match) return '';
    return String(match[1] || '')
        .trim()
        .replace(/^["']|["']$/g, '');
}

const base = String(
    process.env.FRONTEND_PUBLIC_URL ||
        process.env.VITE_PUBLIC_SITE_URL ||
        readEnvValue(envPath, 'FRONTEND_PUBLIC_URL') ||
        readEnvValue(envPath, 'VITE_PUBLIC_SITE_URL') ||
        '',
)
    .trim()
    .replace(/\/$/, '');

const lines = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /hesabim', ''];

if (base) {
    lines.push(`Sitemap: ${base}/sitemap.xml`);
} else {
    lines.push('# Sitemap: build icin FRONTEND_PUBLIC_URL tanimlayin');
}

fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`[write-robots] ${outPath} yazildi${base ? ` (${base})` : ' (Sitemap satiri yorum)'}`);
