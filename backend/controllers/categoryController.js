const { Op } = require('sequelize');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { logAdminAudit } = require('../services/auditService');

const TR_TO_ASCII = { ı: 'i', İ: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c' };

const slugify = (s) =>
    String(s || '')
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, (ch) => TR_TO_ASCII[ch] || ch)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);

async function uniqueSlug(base, excludeId) {
    const root = base || 'kategori';
    let slug = root;
    let n = 2;
    while (true) {
        const exists = await Category.findOne({
            where: excludeId
                ? { slug, id: { [Op.ne]: excludeId } }
                : { slug },
        });
        if (!exists) return slug;
        slug = `${root}-${n++}`;
    }
}

// PUBLIC — sadece aktifler
exports.listPublic = async (_req, res) => {
    try {
        const categories = await Category.findAll({
            where: { isActive: true },
            order: [['displayOrder', 'ASC'], ['name', 'ASC']],
            attributes: ['id', 'name', 'slug', 'displayOrder', 'meta_title', 'meta_description'],
        });
        res.json({ status: 'success', data: { categories } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ADMIN — hepsi
exports.listAll = async (_req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']],
        });
        res.json({ status: 'success', data: { categories } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) {
            return res.status(400).json({ status: 'fail', message: 'Kategori adı zorunludur.' });
        }
        if (name.length > 100) {
            return res.status(400).json({ status: 'fail', message: 'Kategori adı en fazla 100 karakter olmalı.' });
        }

        const dupe = await Category.findOne({ where: { name } });
        if (dupe) {
            return res.status(400).json({ status: 'fail', message: 'Bu adda bir kategori zaten var.' });
        }

        const slug = await uniqueSlug(slugify(name));
        const max = await Category.max('displayOrder');
        const meta_title =
            req.body.meta_title !== undefined && String(req.body.meta_title).trim()
                ? String(req.body.meta_title).trim().slice(0, 180)
                : null;
        const meta_description =
            req.body.meta_description !== undefined && String(req.body.meta_description).trim()
                ? String(req.body.meta_description).trim().slice(0, 300)
                : null;
        const cat = await Category.create({
            name,
            slug,
            displayOrder: (Number.isFinite(max) ? max : 0) + 1,
            isActive: true,
            meta_title,
            meta_description,
        });
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'category.create',
            entityType: 'category',
            entityId: cat.id,
            meta: { name: cat.name },
        });
        res.status(201).json({ status: 'success', data: { category: cat } });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ status: 'fail', message: 'Bu adda bir kategori zaten var.' });
        }
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) {
            return res.status(404).json({ status: 'fail', message: 'Kategori bulunamadı.' });
        }

        const updates = {};
        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim();
            if (!name) {
                return res.status(400).json({ status: 'fail', message: 'Kategori adı boş olamaz.' });
            }
            if (name !== cat.name) {
                const dupe = await Category.findOne({ where: { name, id: { [Op.ne]: cat.id } } });
                if (dupe) {
                    return res.status(400).json({ status: 'fail', message: 'Bu adda bir kategori zaten var.' });
                }
                updates.name = name;
                updates.slug = await uniqueSlug(slugify(name), cat.id);
            }
        }
        if (req.body.isActive !== undefined) {
            updates.isActive = Boolean(req.body.isActive);
        }
        if (req.body.meta_title !== undefined) {
            const m = String(req.body.meta_title).trim().slice(0, 180);
            updates.meta_title = m || null;
        }
        if (req.body.meta_description !== undefined) {
            const m = String(req.body.meta_description).trim().slice(0, 300);
            updates.meta_description = m || null;
        }

        const prevName = cat.name;
        await cat.update(updates);

        // İsim değiştiyse ürünlerdeki eski kategori adını güncelle
        if (updates.name != null && updates.name !== prevName) {
            await Product.update(
                { category: updates.name },
                { where: { category: prevName } },
            );
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'category.update',
            entityType: 'category',
            entityId: cat.id,
            meta: {
                keys: Object.keys(updates),
                name: cat.name,
            },
        });

        res.json({ status: 'success', data: { category: cat } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Sıralama: { direction: 'up' | 'down' }
exports.moveCategory = async (req, res) => {
    try {
        const dir = req.body.direction;
        if (!['up', 'down'].includes(dir)) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz yön.' });
        }

        const cat = await Category.findByPk(req.params.id);
        if (!cat) {
            return res.status(404).json({ status: 'fail', message: 'Kategori bulunamadı.' });
        }

        const neighbor = await Category.findOne({
            where: {
                displayOrder: dir === 'up'
                    ? { [Op.lt]: cat.displayOrder }
                    : { [Op.gt]: cat.displayOrder },
            },
            order: [['displayOrder', dir === 'up' ? 'DESC' : 'ASC']],
        });

        if (!neighbor) {
            return res.json({ status: 'success', message: 'Zaten ' + (dir === 'up' ? 'en üstte' : 'en altta') + '.' });
        }

        const a = cat.displayOrder;
        const b = neighbor.displayOrder;
        await cat.update({ displayOrder: b });
        await neighbor.update({ displayOrder: a });

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'category.reorder',
            entityType: 'category',
            entityId: cat.id,
            meta: { direction: dir },
        });

        res.json({ status: 'success' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const cat = await Category.findByPk(req.params.id);
        if (!cat) {
            return res.status(404).json({ status: 'fail', message: 'Kategori bulunamadı.' });
        }

        const usedCount = await Product.count({ where: { category: cat.name } });
        if (usedCount > 0 && req.query.force !== '1') {
            return res.status(400).json({
                status: 'fail',
                message: `Bu kategoriye atanmış ${usedCount} ürün var. Önce ürünleri başka kategoriye taşıyın veya zorla silmek için "force=1" parametresi ekleyin.`,
                data: { usedCount },
            });
        }

        if (usedCount > 0) {
            await Product.update({ category: null }, { where: { category: cat.name } });
        }

        const snapName = cat.name;
        await cat.destroy();
        await logAdminAudit({
            req,
            adminUser: req.user,
            action: 'category.delete',
            entityType: 'category',
            entityId: req.params.id,
            meta: {
                name: snapName,
                force: req.query.force === '1',
                clearedProducts: usedCount > 0,
            },
        });
        res.json({ status: 'success', message: 'Kategori silindi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
