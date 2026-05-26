const Warehouse = require('../models/Warehouse');
const ProductWarehouseStock = require('../models/ProductWarehouseStock');

exports.list = async (_req, res) => {
    try {
        const warehouses = await Warehouse.findAll({ order: [['displayOrder', 'ASC'], ['name', 'ASC']] });
        res.status(200).json({ status: 'success', data: { warehouses } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const code = String(req.body.code || '')
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '');
        if (!name || !code) {
            return res.status(400).json({ status: 'fail', message: 'Depo adı ve kodu zorunludur.' });
        }
        const max = await Warehouse.max('displayOrder');
        const w = await Warehouse.create({
            name: name.slice(0, 120),
            code: code.slice(0, 32),
            displayOrder: (Number.isFinite(max) ? max : 0) + 1,
            isActive: req.body.isActive !== false,
        });
        res.status(201).json({ status: 'success', data: { warehouse: w } });
    } catch (err) {
        if (err?.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ status: 'fail', message: 'Bu depo kodu zaten kullanılıyor.' });
        }
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const w = await Warehouse.findByPk(req.params.id);
        if (!w) return res.status(404).json({ status: 'fail', message: 'Depo bulunamadı.' });

        if (req.body.name !== undefined) w.name = String(req.body.name).trim().slice(0, 120);
        if (req.body.isActive !== undefined) w.isActive = Boolean(req.body.isActive);
        if (req.body.displayOrder !== undefined) {
            const n = parseInt(req.body.displayOrder, 10);
            if (Number.isFinite(n)) w.displayOrder = n;
        }
        await w.save();
        res.status(200).json({ status: 'success', data: { warehouse: w } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const w = await Warehouse.findByPk(req.params.id);
        if (!w) return res.status(404).json({ status: 'fail', message: 'Depo bulunamadı.' });
        if (w.code === 'MAIN') {
            return res.status(400).json({ status: 'fail', message: 'Ana depo silinemez.' });
        }
        const cnt = await ProductWarehouseStock.sum('quantity', { where: { warehouseId: w.id } });
        const resv = await ProductWarehouseStock.sum('reserved', { where: { warehouseId: w.id } });
        if ((cnt || 0) > 0 || (resv || 0) > 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bu depoda hâlâ stok veya rezervasyon var. Önce stokları taşıyın veya sıfırlayın.',
            });
        }
        await w.destroy();
        res.status(200).json({ status: 'success', message: 'Depo silindi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Ürün için depo bazlı stok listesi (admin). */
exports.productStocks = async (req, res) => {
    try {
        const rows = await ProductWarehouseStock.findAll({
            where: { productId: req.params.productId },
            include: [{ model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code', 'displayOrder', 'isActive'] }],
            order: [[{ model: Warehouse, as: 'warehouse' }, 'displayOrder', 'ASC']],
        });
        res.status(200).json({ status: 'success', data: { rows } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Depo satırı miktarını güncelle (admin). */
exports.patchProductStock = async (req, res) => {
    try {
        const Product = require('../models/Product');
        const inv = require('../services/inventoryService');
        const p = await Product.findByPk(req.params.productId);
        if (!p) return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });

        const qty = Math.max(0, Math.floor(Number(req.body.quantity) || 0));
        const row = await ProductWarehouseStock.findOne({
            where: { productId: p.id, warehouseId: req.params.warehouseId },
        });
        if (!row) {
            return res.status(404).json({ status: 'fail', message: 'Bu depoda bu ürün için kayıt yok.' });
        }
        const resv = Number(row.reserved) || 0;
        if (qty < resv) {
            return res.status(400).json({
                status: 'fail',
                message: 'Miktar, rezerve edilen adetten az olamaz.',
            });
        }
        await row.update({ quantity: qty });
        await inv.syncProductStockField(p.id);
        const fresh = await Product.findByPk(p.id);
        res.status(200).json({ status: 'success', data: { product: fresh, row } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
