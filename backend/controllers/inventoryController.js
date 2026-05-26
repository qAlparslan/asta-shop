const SiteSetting = require('../models/SiteSetting');
const Product = require('../models/Product');
const { getAvailableStock } = require('../services/inventoryService');

exports.lowStock = async (_req, res) => {
    try {
        let th = 5;
        const row = await SiteSetting.findByPk('lowStockThreshold');
        if (row && row.value != null) {
            const n = parseInt(String(row.value), 10);
            if (Number.isFinite(n) && n >= 0) th = n;
        }

        const products = await Product.findAll({
            where: { is_active: true },
            order: [['name', 'ASC']],
        });

        const low = [];
        for (const p of products) {
            const avail = await getAvailableStock(p.id);
            if (avail <= th) {
                const j = p.toJSON();
                j.availableStock = avail;
                low.push(j);
            }
        }

        res.status(200).json({
            status: 'success',
            data: { threshold: th, products: low, count: low.length },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
