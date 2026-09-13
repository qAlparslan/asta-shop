const fs = require('fs');
const path = require('path');

const uploadsRoot = path.resolve(path.join(__dirname, '..', 'uploads'));

if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
}

/**
 * `/uploads` altındaki göreli yolu güvenli mutlak dosya yoluna çevirir.
 * @param {string} relRaw
 * @returns {string | null}
 */
function resolveSafeUploadFile(relRaw) {
    let rel = String(relRaw || '').trim().replace(/\\/g, '/');
    if (!rel) return null;
    if (rel.startsWith('/uploads/')) rel = rel.slice('/uploads/'.length);
    else if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
    else if (rel.startsWith('/')) rel = rel.slice(1);
    if (!rel || rel.includes('\0') || rel.split('/').some((p) => p === '..' || p === '')) {
        return null;
    }
    const abs = path.resolve(uploadsRoot, rel);
    const rootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : `${uploadsRoot}${path.sep}`;
    if (abs !== uploadsRoot && !abs.startsWith(rootWithSep)) return null;
    return abs;
}

/**
 * Tarayıcıda `/uploads/x.jpg` Nginx statik kuralına takılmasın diye
 * `/api/media?path=` (uzantı URL sonunda değil) kullanılır.
 * @param {string} storedPath  örn. `/uploads/site/logo.png`
 * @param {string} [siteBase]  `https://astaticaret.com`
 */
function publicUploadUrl(storedPath, siteBase = '') {
    const raw = String(storedPath || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const rel = raw.startsWith('/uploads/')
        ? raw.slice('/uploads/'.length)
        : raw.replace(/^\/+/, '');
    if (!rel) return '';
    const root = String(siteBase || '').replace(/\/$/, '');
    return `${root}/api/media?path=${encodeURIComponent(rel)}`;
}

module.exports = { uploadsRoot, resolveSafeUploadFile, publicUploadUrl };
