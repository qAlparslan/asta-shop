const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const ProductStockAlert = require('../models/ProductStockAlert');
const User = require('../models/User');
const {
    getUserProductReviewAllowance,
    getReviewStats,
    serializeReview,
} = require('../services/productReviewService');

exports.listReviews = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        const [reviews, stats] = await Promise.all([
            ProductReview.findAll({
                attributes: { exclude: ['notifyEmail'] },
                where: { productId, approved: true },
                order: [['createdAt', 'DESC']],
                limit: 80,
            }),
            getReviewStats(productId),
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                reviews: reviews.map(serializeReview),
                stats,
            },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.reviewEligibility = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findByPk(productId);
        if (!product || !product.is_active) {
            return res.status(404).json({ status: 'fail', message: 'Ürün bulunamadı.' });
        }

        if (!req.user?.id) {
            return res.status(200).json({
                status: 'success',
                data: {
                    canReview: false,
                    purchased: false,
                    hasReview: false,
                    reason: 'login_required',
                },
            });
        }

        const allowance = await getUserProductReviewAllowance(req.user.id, productId);

        let reason = null;
        if (!allowance.purchased) reason = 'not_purchased';
        else if (!allowance.canReview) reason = 'all_reviews_used';

        res.status(200).json({
            status: 'success',
            data: {
                canReview: allowance.canReview,
                purchased: allowance.purchased,
                purchaseCount: allowance.purchaseCount,
                reviewCount: allowance.reviewCount,
                remainingReviews: allowance.remainingReviews,
                hasReview: allowance.reviewCount > 0,
                reason,
            },
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

        if (!req.user?.id) {
            return res.status(401).json({ status: 'fail', message: 'Yorum yapmak için giriş yapmalısınız.' });
        }

        const u = await User.findByPk(req.user.id);
        if (!u) {
            return res.status(401).json({ status: 'fail', message: 'Geçersiz oturum.' });
        }

        const allowance = await getUserProductReviewAllowance(u.id, productId);
        if (!allowance.purchased) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bu ürüne yorum yapabilmek için önce satın almış olmanız gerekir.',
            });
        }
        if (!allowance.canReview) {
            return res.status(400).json({
                status: 'fail',
                message:
                    'Bu ürün için mevcut siparişlerinize ait yorum hakkınızı kullandınız. Yeni bir sipariş verdikten sonra tekrar yorum yapabilirsiniz.',
            });
        }

        let rating = Math.floor(Number(req.body.rating));
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ status: 'fail', message: 'Geçersiz puan (1–5).' });
        }

        const rawBody = typeof req.body.body === 'string' ? req.body.body : req.body.comment;
        const body = String(rawBody || '').trim();
        if (body.length < 4) {
            return res.status(400).json({ status: 'fail', message: 'Yorum en az 4 karakter olmalı.' });
        }
        if (body.length > 4000) {
            return res.status(400).json({ status: 'fail', message: 'Yorum çok uzun.' });
        }

        const files = Array.isArray(req.files) ? req.files.slice(0, 4) : [];
        const images = files.map((f) => `/uploads/reviews/${f.filename}`);

        const authorName = (u.fullName && String(u.fullName).trim()) || u.email || 'Üye';

        const review = await ProductReview.create({
            productId,
            userId: u.id,
            authorName,
            rating,
            body,
            images,
            approved: true,
        });

        res.status(201).json({
            status: 'success',
            message: 'Yorumunuz yayınlandı. Teşekkür ederiz.',
            data: { review: serializeReview(review) },
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
