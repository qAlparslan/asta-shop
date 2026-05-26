const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/newsletterController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { newsletterSubscribeLimiter } = require('../middlewares/rateLimits');

// Public — herkes
router.post('/subscribe', newsletterSubscribeLimiter, ctrl.subscribe);
router.get('/confirm/:token', ctrl.confirm);
router.get('/unsubscribe/:token', ctrl.unsubscribe);

// Admin
router.get('/', protect, restrictTo('admin'), ctrl.listAdmin);

module.exports = router;
