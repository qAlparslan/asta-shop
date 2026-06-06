const Product = require('../models/Product');
const User = require('../models/User');
const { recordCartAdd, syncActiveCart } = require('../services/cartInterestService');

exports.trackAdd = async (req, res) => {
    try {
        const productId = String(req.body?.productId || '').trim();
        if (!productId) {
            return res.status(400).json({ status: 'fail', message: 'productId gerekli.' });
        }

        const product = await Product.findByPk(productId, { attributes: ['id', 'is_active'] });
        if (!product || !product.is_active) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        const sessionId =
            typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim().slice(0, 64) : '';
        const variantId =
            req.body?.variantId == null || req.body?.variantId === ''
                ? null
                : String(req.body.variantId).trim().slice(0, 64);

        let userId = null;
        let email = null;
        if (req.user?.id) {
            userId = req.user.id;
            const u = await User.findByPk(userId, { attributes: ['email', 'fullName'] });
            email = u?.email ? String(u.email).trim().toLowerCase() : null;
        }

        if (!userId && !sessionId) {
            return res.status(400).json({ status: 'fail', message: 'sessionId gerekli.' });
        }

        await recordCartAdd({ productId, variantId, userId, sessionId: sessionId || null, email });

        res.status(200).json({ status: 'success', message: 'Sepet kaydı alındı.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.syncCart = async (req, res) => {
    try {
        const sessionId =
            typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim().slice(0, 64) : '';
        const productIds = Array.isArray(req.body?.productIds)
            ? req.body.productIds.map((id) => String(id).trim()).filter(Boolean)
            : [];

        const userId = req.user?.id || null;
        if (!userId && !sessionId) {
            return res.status(400).json({ status: 'fail', message: 'sessionId gerekli.' });
        }

        await syncActiveCart({ userId, sessionId: sessionId || null, productIds });

        res.status(200).json({ status: 'success', message: 'Sepet senkronize edildi.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
