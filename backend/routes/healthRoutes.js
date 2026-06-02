const express = require('express');
const ctrl = require('../controllers/healthController');
const auth = require('../middlewares/authMiddleware');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

const mailTestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: parseInt(process.env.RATE_LIMIT_MAIL_TEST_MAX || '5', 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { status: 'fail', message: 'Çok fazla test maili isteği. 15 dakika sonra tekrar deneyin.' },
});

// SMTP doğrulaması (verify) bir bağlantı + auth açar. Tekrarlanan başarısız auth
// posta sağlayıcısından IP bloğuna yol açabilir; bu yüzden ping de sınırlandırılır.
const mailPingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: parseInt(process.env.RATE_LIMIT_MAIL_PING_MAX || '6', 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Çok fazla SMTP doğrulama denemesi. Blok riskine karşı 15 dakika bekleyin.',
    },
});

/** Eski /api/health ile uyumlu */
router.get('/', ctrl.getLiveness);
router.get('/live', ctrl.getLiveness);
router.get('/ready', ctrl.getReadiness);
router.get('/detailed', auth.protect, auth.restrictTo('admin'), ctrl.getDetailed);

router.post('/mail/ping', auth.protect, auth.restrictTo('admin'), mailPingLimiter, ctrl.mailPing);
router.post(
    '/mail/test',
    auth.protect,
    auth.restrictTo('admin'),
    mailTestLimiter,
    ctrl.mailTest,
);
router.get(
    '/mail/recipients',
    auth.protect,
    auth.restrictTo('admin'),
    ctrl.mailRecipientsHint,
);

module.exports = router;
