const crypto = require('crypto');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const User = require('../models/User');
const { sendMail, getMailMeta, getFrontendUrl } = require('../services/mailer');
const newsletterConfirmTemplate = require('../services/emailTemplates/newsletterConfirm');

function normalizeEmail(e) {
    return String(e || '').trim().toLowerCase();
}

// ─── POST /api/newsletter/subscribe ──────────────────────────────────────────
// Genel ziyaretçi e-postası alır, double-opt-in onay maili gönderir.
exports.subscribe = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const source = String(req.body.source || 'footer').slice(0, 50);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: 'fail', message: 'Geçerli bir e-posta gir.' });
        }

        let sub = await NewsletterSubscriber.findOne({ where: { email } });
        const confirmToken = crypto.randomBytes(24).toString('hex');

        if (!sub) {
            const unsubscribeToken = crypto.randomBytes(24).toString('hex');
            sub = await NewsletterSubscriber.create({
                email,
                status: 'pending',
                confirmToken,
                unsubscribeToken,
                source,
            });
        } else if (sub.status === 'active') {
            return res.status(200).json({
                status: 'success',
                message: 'Bu e-posta zaten aktif aboneler arasında. Teşekkürler!',
                alreadyActive: true,
            });
        } else {
            // pending veya unsubscribed → yeniden gönder, status'u pending'e çek
            await sub.update({
                status: 'pending',
                confirmToken,
                source,
            });
        }

        const meta = await getMailMeta();
        const confirmUrl = `${getFrontendUrl()}/abonelik-onayi/${confirmToken}`;
        const tpl = newsletterConfirmTemplate({ confirmUrl, storeName: meta.storeName, logoUrl: meta.logoUrl });

        // Fire-and-forget
        sendMail({
            to: email,
            ...tpl,
            type: 'newsletterConfirm',
            relatedId: sub.id,
        });

        res.status(200).json({
            status: 'success',
            message:
                'Onay maili gönderdik. Aboneliğini tamamlamak için mailindeki linke tıklaman gerekiyor.',
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── GET /api/newsletter/confirm/:token ──────────────────────────────────────
// Double opt-in onay endpoint'i. Frontend bir sayfadan bu API'yi çağırır.
exports.confirm = async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) return res.status(400).json({ status: 'fail', message: 'Geçersiz token.' });

        const sub = await NewsletterSubscriber.findOne({ where: { confirmToken: token } });
        if (!sub) {
            return res
                .status(404)
                .json({ status: 'fail', message: 'Bu onay bağlantısı geçersiz veya kullanılmış.' });
        }

        if (sub.status !== 'active') {
            await sub.update({
                status: 'active',
                confirmedAt: new Date(),
                confirmToken: null,
            });
        }

        const emailNorm = normalizeEmail(sub.email);
        const linkedUser = emailNorm ? await User.findOne({ where: { email: emailNorm } }) : null;
        if (linkedUser) {
            await linkedUser.update({ emailConsentNewsletter: true });
        }

        res.status(200).json({
            status: 'success',
            message: 'Aboneliğin onaylandı. Hoş geldin!',
            email: sub.email,
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── GET /api/newsletter/unsubscribe/:token ──────────────────────────────────
// Hem newsletter aboneleri hem de kayıtlı kullanıcılar için ortak endpoint.
// Token'a göre hangi kaynağı eşleştiyse onun aboneliğini iptal eder.
exports.unsubscribe = async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) return res.status(400).json({ status: 'fail', message: 'Geçersiz token.' });

        // 1) Newsletter abone mi?
        const sub = await NewsletterSubscriber.findOne({ where: { unsubscribeToken: token } });
        if (sub) {
            if (sub.status !== 'unsubscribed') {
                await sub.update({ status: 'unsubscribed', unsubscribedAt: new Date() });
            }
            return res.status(200).json({
                status: 'success',
                kind: 'newsletter',
                email: sub.email,
                message: 'Bültene aboneliğin iptal edildi. Tekrar abone olmak istersen footer formundan katılabilirsin.',
            });
        }

        // 2) Kayıtlı kullanıcı mı? Marketing iznini kapat.
        const user = await User.findOne({ where: { unsubscribeToken: token } });
        if (user) {
            await user.update({
                emailConsentOffers: false,
                emailConsentNewsletter: false,
                marketingConsent: false,
                marketingConsentAt: null,
            });
            return res.status(200).json({
                status: 'success',
                kind: 'user',
                email: user.email,
                message: 'Pazarlama maillerimizi artık almayacaksın. Hesabın hâlâ aktif.',
            });
        }

        return res
            .status(404)
            .json({ status: 'fail', message: 'Bu abonelik iptali bağlantısı geçersiz.' });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// ─── GET /api/newsletter (admin) ─────────────────────────────────────────────
// Admin abone listesi
exports.listAdmin = async (req, res) => {
    try {
        const rows = await NewsletterSubscriber.findAll({
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'email', 'status', 'source', 'createdAt', 'confirmedAt', 'unsubscribedAt'],
            limit: 1000,
        });
        const stats = rows.reduce(
            (acc, r) => {
                acc.total += 1;
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            },
            { total: 0, active: 0, pending: 0, unsubscribed: 0 }
        );
        res.status(200).json({ status: 'success', data: { subscribers: rows, stats } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
