const path = require('path');
const fs = require('fs');
const multer = require('multer');
const HomeHeroSlide = require('../models/HomeHeroSlide');
const { logAdminAudit } = require('../services/auditService');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'home-hero');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.webp').toLowerCase();
        cb(null, `hero-${Date.now()}${ext}`);
    },
});

exports.uploadHeroBgMiddleware = multer({
    storage: uploadStorage,
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const mime = file.mimetype || '';
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mimeOk = /^image\/(png|jpe?g|webp|gif)$/i.test(mime);
        const extOk = /\.(png|jpe?g|webp|gif)$/i.test(ext);
        if (mimeOk || (!mime.trim() && extOk)) cb(null, true);
        else {
            cb(new Error('Hero arka planı için yalnızca PNG, JPEG, WebP veya GIF kullanın.'));
        }
    },
}).single('file');

/** Ziyaretçi — aktif sıralı */
exports.listPublic = async (_req, res) => {
    try {
        const rows = await HomeHeroSlide.findAll({
            where: { isActive: true },
            order: [['sortOrder', 'ASC']],
            attributes: [
                'id',
                'title',
                'subtitle',
                'ctaText',
                'ctaUrl',
                'bgType',
                'bgGradient',
                'bgImageUrl',
                'imageAlt',
            ],
        });
        res.status(200).json({ status: 'success', data: { slides: rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Admin — tümü */
exports.listAll = async (_req, res) => {
    try {
        const rows = await HomeHeroSlide.findAll({
            order: [['sortOrder', 'ASC']],
        });
        res.status(200).json({ status: 'success', data: { slides: rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const {
            title,
            subtitle,
            ctaText,
            ctaUrl,
            bgType = 'gradient',
            bgGradient,
            bgImageUrl,
            imageAlt,
            isActive = true,
        } = req.body;

        if (!title || !subtitle || !ctaText) {
            return res.status(400).json({
                status: 'fail',
                message: 'title, subtitle ve ctaText zorunludur.',
            });
        }

        const maxOrd = await HomeHeroSlide.max('sortOrder');
        const sortOrder = Number.isFinite(Number(maxOrd)) ? Number(maxOrd) + 1 : 0;

        const slide = await HomeHeroSlide.create({
            sortOrder,
            title: String(title).slice(0, 200),
            subtitle: String(subtitle).slice(0, 500),
            ctaText: String(ctaText).slice(0, 100),
            ctaUrl: String(ctaUrl || '/magaza').slice(0, 500),
            bgType: bgType === 'image' ? 'image' : 'gradient',
            bgGradient: bgType === 'image' ? null : (bgGradient || '').slice(0, 4000) || null,
            bgImageUrl:
                bgType === 'image' && bgImageUrl ? String(bgImageUrl).slice(0, 500) : null,
            isActive: Boolean(isActive),
        });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'hero.create',
            entityType: 'home_hero_slide',
            entityId: slide.id,
            meta: { title: slide.title },
        });

        res.status(201).json({ status: 'success', data: { slide } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const slide = await HomeHeroSlide.findByPk(req.params.id);
        if (!slide) {
            return res.status(404).json({ status: 'fail', message: 'Kayıt bulunamadı.' });
        }

        const patch = {};
        const {
            title,
            subtitle,
            ctaText,
            ctaUrl,
            bgType,
            bgGradient,
            bgImageUrl,
            imageAlt,
            isActive,
            sortOrder,
        } = req.body;

        if (title !== undefined) patch.title = String(title).slice(0, 200);
        if (subtitle !== undefined) patch.subtitle = String(subtitle).slice(0, 500);
        if (ctaText !== undefined) patch.ctaText = String(ctaText).slice(0, 100);
        if (ctaUrl !== undefined) patch.ctaUrl = String(ctaUrl || '/urunler').slice(0, 500);
        if (bgType !== undefined) patch.bgType = bgType === 'image' ? 'image' : 'gradient';
        if (bgGradient !== undefined) patch.bgGradient = bgGradient ? String(bgGradient).slice(0, 4000) : null;
        if (bgImageUrl !== undefined) patch.bgImageUrl = bgImageUrl ? String(bgImageUrl).slice(0, 500) : null;
        if (imageAlt !== undefined)
            patch.imageAlt = imageAlt ? String(imageAlt).slice(0, 500) : null;
        if (isActive !== undefined) patch.isActive = Boolean(isActive);
        if (sortOrder !== undefined) {
            const n = parseInt(sortOrder, 10);
            if (!Number.isNaN(n)) patch.sortOrder = n;
        }

        await slide.update(patch);

        const fresh = await HomeHeroSlide.findByPk(slide.id);

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'hero.update',
            entityType: 'home_hero_slide',
            entityId: slide.id,
            meta: {
                patchKeys: Object.keys(patch),
            },
        });

        res.status(200).json({ status: 'success', data: { slide: fresh } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const slide = await HomeHeroSlide.findByPk(req.params.id);
        if (!slide) {
            return res.status(404).json({ status: 'fail', message: 'Kayıt bulunamadı.' });
        }

        await slide.destroy({ force: true });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'hero.delete',
            entityType: 'home_hero_slide',
            entityId: req.params.id,
            meta: { title: slide.title },
        });
        res.status(200).json({ status: 'success', message: 'Silindi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.reorder = async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'orderedIds dizi olarak gönderilmelidir.',
            });
        }

        for (let i = 0; i < orderedIds.length; i++) {
            await HomeHeroSlide.update({ sortOrder: i }, { where: { id: orderedIds[i] } });
        }

        const rows = await HomeHeroSlide.findAll({ order: [['sortOrder', 'ASC']] });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'hero.reorder',
            entityType: 'home_hero_slide',
            entityId: null,
            meta: { orderedCount: orderedIds.length },
        });

        res.status(200).json({ status: 'success', data: { slides: rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.uploadBg = async (req, res) => {
    try {
        if (!req.file?.filename) {
            return res.status(400).json({ status: 'fail', message: 'Dosya yok.' });
        }
        const rel = `/uploads/home-hero/${req.file.filename}`;
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'hero.upload_bg_asset',
            entityType: 'home_hero_slide',
            entityId: null,
            meta: { path: rel },
        });
        res.status(200).json({ status: 'success', data: { path: rel } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
