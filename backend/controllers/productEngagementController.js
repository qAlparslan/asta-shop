const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const ProductStockAlert = require('../models/ProductStockAlert');
const User = require('../models/User');

exports.listReviews = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        const reviews = await ProductReview.findAll({
            attributes: {
                exclude: ['notifyEmail'],
            },
            where: { productId, approved: true },
            order: [['createdAt', 'DESC']],
            limit: 80,
        });

        res.status(200).json({
            status: 'success',
            data: { reviews },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.createReview = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId);
        if (!product || !product.is_active) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı veya satışta değil.' });
        }

        let rating = Math.floor(Number(req.body.rating));
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz puan (1–5).' });
        }

        const rawBody = typeof req.body.body === 'string' ? req.body.body : req.body.comment;
        const body = String(rawBody || '').trim();
        if (body.length < 4) {
            return res.status(400).json({ status: 'fail', message: 'Yorum çok kısa.' });
        }
        if (body.length > 4000) {
            return res.status(400).json({ status: 'fail', message: 'Yorum çok uzun.' });
        }

        let userId = null;
        let authorName;

        if (req.user?.id) {
            const u = await User.findByPk(req.user.id);
            if (!u) {
                return res.status(401).json({ status: 'fail', message: 'Geçersiz oturum.' });
            }
            userId = u.id;
            authorName = (u.fullName && String(u.fullName).trim()) || u.email || 'Üye';
        } else {
            authorName = String(req.body.authorName || req.body.guestName || '').trim();
            if (authorName.length < 2) {
                return res.status(400).json({ status: 'fail', message: 'Misafir yorumlar için görünür ad gereklidir.' });
            }
            if (authorName.length > 120) {
                return res.status(400).json({ status: 'fail', message: 'Ad çok uzun.' });
            }
        }

        let notifyEmail = null;
        if (!userId) {
            const rawN = String(req.body.notifyEmail || '').trim().toLowerCase();
            if (rawN) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawN)) {
                    return res.status(400).json({
                        status: 'fail',
                        message: 'Bildirim e-postası geçersiz.',
                    });
                }
                notifyEmail = rawN;
            }
        }

        const review = await ProductReview.create({
            productId,
            userId,
            authorName,
            rating,
            body,
            notifyEmail,
            approved: false,
        });

        const safeReview = review.toJSON();
        delete safeReview.notifyEmail;

        res.status(201).json({
            status: 'success',
            message: 'Yorumunuz alındı; yönetici onayından sonra yayınlanacaktır.',
            data: { review: safeReview },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.subscribeStockAlert = async (req, res) => {
    try {
        const productId = req.params.id;
        const email = String(req.body.email || '')
            .trim()
            .toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: 'fail', message: 'Geçerli e-posta gerekli.' });
        }

        const product = await Product.findByPk(productId);
        if (!product || !product.is_active) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        const stock = Number(product.stock) || 0;
        if (stock > 0) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bu ürün stokta. Stok bittiğinde kayıt açabilirsiniz.',
            });
        }

        await ProductStockAlert.findOrCreate({
            where: { productId, email },
            defaults: { productId, email },
        });

        res.status(200).json({
            status: 'success',
            message: 'Stoğa girdiğinde bu adrese bildirim göndereceğiz.',
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
