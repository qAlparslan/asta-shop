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

/** Eski /api/health ile uyumlu */
router.get('/', ctrl.getLiveness);
router.get('/live', ctrl.getLiveness);
router.get('/ready', ctrl.getReadiness);
router.get('/detailed', auth.protect, auth.restrictTo('admin'), ctrl.getDetailed);

router.post('/mail/ping', auth.protect, auth.restrictTo('admin'), ctrl.mailPing);
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
