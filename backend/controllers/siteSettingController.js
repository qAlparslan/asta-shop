const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const SiteSetting = require('../models/SiteSetting');
const { logAdminAudit } = require('../services/auditService');

const SETTINGS_EXCLUDE_FROM_PUBLIC = new Set(['legalDocumentsJson']);

const SETTINGS_BLOCKED_IN_BULK = new Set(['legalDocumentsJson']);

const castValue = (v, type) => {
    if (v === null || v === undefined) return null;
    if (type === 'number') {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    }
    if (type === 'boolean') return String(v).toLowerCase() === 'true';
    return String(v);
};

const settingsToObject = (rows) => {
    const obj = {};
    for (const r of rows) obj[r.key] = castValue(r.value, r.type);
    return obj;
};

const HERO_TRUST_PRESET_KEYS = new Set([
    'shield-soft',
    'shield-ring',
    'shield-tint',
    'truck-soft',
    'truck-ring',
    'truck-tint',
    'lock-soft',
    'lock-ring',
    'lock-tint',
    'headphones-soft',
    'headphones-ring',
    'headphones-tint',
]);

function sanitizeHeroTrustCardsForStore(stringVal) {
    let arr;
    try {
        arr = JSON.parse(stringVal);
    } catch {
        throw new Error('"heroTrustCards" geçerli bir JSON dizisi olmalıdır.');
    }
    if (!Array.isArray(arr)) {
        throw new Error('"heroTrustCards" bir dizi olmalıdır.');
    }
    if (arr.length > 4) {
        throw new Error('En fazla 4 güven kartı eklenebilir.');
    }
    /** @type {Array<Record<string, unknown>>} */
    const out = [];
    const idOkRx = /^[a-zA-Z0-9_-]{4,64}$/;

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item || typeof item !== 'object') {
            continue;
        }
        const title = String((/** @type {any} */ (item)).title ?? '').trim();
        if (!title || title.length > 200) {
            throw new Error(`heroTrustCards[${i}]: başlık zorunludur ve en fazla 200 karakter olmalıdır.`);
        }
        let id = String((/** @type {any} */ (item)).id ?? '').trim().slice(0, 64);
        if (!idOkRx.test(id)) {
            id = crypto.randomUUID();
        }
        let presetKey = String((/** @type {any} */ (item)).presetKey ?? '').trim();
        if (!HERO_TRUST_PRESET_KEYS.has(presetKey)) {
            const legacyIcon = String((/** @type {any} */ (item)).iconKey ?? '').trim();
            const fallbackByIcon = {
                shield: 'shield-soft',
                truck: 'truck-soft',
                lock: 'lock-soft',
                headphones: 'headphones-soft',
            };
            presetKey =
                Object.prototype.hasOwnProperty.call(fallbackByIcon, legacyIcon)
                    ? /** @type {any} */ (fallbackByIcon)[legacyIcon]
                    : 'shield-soft';
        }

        out.push({
            id,
            presetKey,
            title,
        });
    }
    return JSON.stringify(out);
}

// PUBLIC: tüm ayarlar (key/value) — bazı anahtarlar (yasal metin kümesi) hariç
exports.getAll = async (_req, res) => {
    try {
        const rows = (await SiteSetting.findAll()).filter((r) => !SETTINGS_EXCLUDE_FROM_PUBLIC.has(r.key));
        res.json({ status: 'success', data: { settings: settingsToObject(rows) } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ADMIN: toplu güncelle
exports.updateMany = async (req, res) => {
    try {
        const updates = (req.body && (req.body.settings || req.body)) || {};
        if (typeof updates !== 'object' || Array.isArray(updates)) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz gövde.' });
        }

        const rows = await SiteSetting.findAll();
        const byKey = new Map(rows.map((r) => [r.key, r]));

        for (const [k, val] of Object.entries(updates)) {
            const row = byKey.get(k);
            if (!row) continue; // bilinmeyen anahtarları yoksay
            if (SETTINGS_BLOCKED_IN_BULK.has(k)) continue;

            let stringVal;
            if (row.type === 'boolean') {
                stringVal = String(Boolean(val) && val !== 'false');
            } else if (row.type === 'number') {
                const n = Number(val);
                if (!Number.isFinite(n) || n < 0) {
                    return res.status(400).json({
                        status: 'fail',
                        message: `"${k}" alanı geçerli bir pozitif sayı olmalıdır.`,
                    });
                }
                stringVal = String(n);
            } else {
                stringVal = val == null ? '' : String(val);
                const maxLen = k === 'frontendCopy' ? 500000 : 5000;
                if (stringVal.length > maxLen) {
                    return res.status(400).json({
                        status: 'fail',
                        message: `"${k}" alanı çok uzun.`,
                    });
                }
                if (k === 'frontendCopy' && stringVal.trim()) {
                    try {
                        JSON.parse(stringVal);
                    } catch {
                        return res.status(400).json({
                            status: 'fail',
                            message: '"frontendCopy" geçerli bir JSON olmalıdır.',
                        });
                    }
                }
                if (k === 'skinFilterOptions' && stringVal.trim()) {
                    let arr;
                    try {
                        arr = JSON.parse(stringVal);
                    } catch {
                        return res.status(400).json({
                            status: 'fail',
                            message: '"skinFilterOptions" geçerli bir JSON dizisi olmalıdır.',
                        });
                    }
                    if (!Array.isArray(arr)) {
                        return res.status(400).json({
                            status: 'fail',
                            message: '"skinFilterOptions" bir dizi olmalıdır.',
                        });
                    }
                    const allowed = new Set(['hassas', 'kuru', 'yagli_karma', 'olgun']);
                    for (const item of arr) {
                        if (!item || typeof item !== 'object' || typeof item.slug !== 'string') {
                            return res.status(400).json({
                                status: 'fail',
                                message: 'skinFilterOptions: her öğede slug metin olmalı.',
                            });
                        }
                        const slug = item.slug.trim();
                        if (!allowed.has(slug)) {
                            return res.status(400).json({
                                status: 'fail',
                                message:
                                    `Geçersiz cilt filtresi slug: "${slug}". İzinlenenler: hassas, kuru, yagli_karma, olgun.`,
                            });
                        }
                        if (
                            typeof item.enabled !== 'undefined' &&
                            typeof item.enabled !== 'boolean'
                        ) {
                            return res.status(400).json({
                                status: 'fail',
                                message: 'skinFilterOptions: enabled alanı yalnızca true/false olabilir.',
                            });
                        }
                    }
                }
                if (k === 'heroTrustCards') {
                    const raw = stringVal.trim() === '' ? '[]' : stringVal.trim();
                    try {
                        stringVal = sanitizeHeroTrustCardsForStore(raw);
                    } catch (heroErr) {
                        return res.status(400).json({
                            status: 'fail',
                            message: heroErr.message || '"heroTrustCards" doğrulanamadı.',
                        });
                    }
                }
            }

            await row.update({ value: stringVal });
        }

        const fresh = await SiteSetting.findAll();

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'settings.update_bulk',
            entityType: 'site_setting',
            entityId: null,
            meta: {
                keysUpdated: Object.keys(updates).filter(
                    (k) => byKey.has(k) && !SETTINGS_BLOCKED_IN_BULK.has(k),
                ),
            },
        });

        res.json({ status: 'success', data: { settings: settingsToObject(fresh) } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Logo yükleme
const logoDir = path.join(__dirname, '..', 'uploads', 'site');
if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoDir),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.png').toLowerCase();
        cb(null, `logo-${Date.now()}${ext}`);
    },
});

exports.uploadMiddleware = multer({
    storage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(png|jpe?g|webp|svg\+xml|gif)$/i.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Sadece görsel dosyası yükleyebilirsiniz.'));
        }
    },
}).single('logo');

exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'fail', message: 'Dosya gönderilmedi.' });
        }
        const url = `/uploads/site/${req.file.filename}`;
        const [row] = await SiteSetting.findOrCreate({
            where: { key: 'logoUrl' },
            defaults: { key: 'logoUrl', value: url, type: 'string' },
        });
        await row.update({ value: url });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'settings.upload_logo',
            entityType: 'site_setting',
            entityId: 'logoUrl',
            meta: {},
        });
        res.json({ status: 'success', data: { url } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
