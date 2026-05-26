const ProductReview = require('../models/ProductReview');
const Product = require('../models/Product');
const User = require('../models/User');
const { logAdminAudit } = require('../services/auditService');
const { sendMail, getMailMeta, getFrontendUrl } = require('../services/mailer');
const productReviewApprovedTemplate = require('../services/emailTemplates/productReviewApproved');

/** Admin: tüm yorumlar (filtre: pending | approved | all) */
exports.list = async (req, res) => {
    try {
        const raw = String(req.query.status || 'pending').toLowerCase();
        const where = {};
        if (raw === 'pending') where.approved = false;
        else if (raw === 'approved') where.approved = true;
        else if (raw !== 'all') where.approved = false;

        const reviews = await ProductReview.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'slug'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Math.min(parseInt(req.query.limit || '200', 10) || 200, 500),
        });

        res.status(200).json({ status: 'success', data: { reviews } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

/** Onayla / yayından kaldır */
exports.updateApproval = async (req, res) => {
    try {
        if (!Object.prototype.hasOwnProperty.call(req.body, 'approved')) {
            return res.status(400).json({ status: 'fail', message: 'approved alanı gerekli (true/false).' });
        }
        const approved = Boolean(req.body.approved);
        const review = await ProductReview.findByPk(req.params.id);
        if (!review) {
            return res.status(404).json({ status: 'fail', message: 'Yorum bulunamadı.' });
        }

        const wasApproved = Boolean(review.approved);

        await review.update({ approved });

        if (approved && !wasApproved) {
            setImmediate(() => {
                (async () => {
                    try {
                        let to = null;
                        let recipientName = review.authorName || 'değerli müşterimiz';
                        if (review.userId) {
                            const u = await User.findByPk(review.userId, {
                                attributes: ['email', 'fullName'],
                            });
                            if (u?.email) {
                                to = u.email;
                                recipientName = u.fullName || u.email.split('@')[0] || recipientName;
                            }
                        }
                        if (!to && review.notifyEmail) {
                            to = String(review.notifyEmail).trim().toLowerCase();
                            recipientName = review.authorName || to.split('@')[0];
                        }
                        if (!to) return;

                        const p = await Product.findByPk(review.productId, {
                            attributes: ['name', 'slug'],
                        });
                        const meta = await getMailMeta();
                        const base = getFrontendUrl();
                        const productUrl = p?.slug ? `${base.replace(/\/$/, '')}/urun/${p.slug}` : base;
                        const html = productReviewApprovedTemplate({
                            recipientName,
                            productName: p?.name,
                            productUrl,
                            rating: review.rating,
                            storeName: meta.storeName,
                            logoUrl: meta.logoUrl,
                        });
                        await sendMail({
                            to,
                            subject: `${meta.storeName}: Yorumunuz yayında`,
                            html,
                            type: 'productReviewApproved',
                            relatedId: review.id,
                        });
                    } catch (e) {
                        console.error('review approved mail:', e.message);
                    }
                })();
            });
        }

        await logAdminAudit({
            req,
            adminUser: req.user,
            action: approved ? 'review.approve' : 'review.unapprove',
            entityType: 'product_review',
            entityId: review.id,
            meta: {
                productId: review.productId,
                authorName: review.authorName,
            },
        });

        res.status(200).json({
            status: 'success',
            message: approved ? 'Yorum onaylandı.' : 'Yorum vitrinden kaldırıldı.',
            data: { review },
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
