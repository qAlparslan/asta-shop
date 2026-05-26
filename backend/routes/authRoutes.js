const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const rateLimits = require('../middlewares/rateLimits');

const router = express.Router();

router.post('/register', rateLimits.registerLimiter, authController.register);
router.post(
    '/login',
    rateLimits.loginIpLimiter,
    rateLimits.loginIdentityLimiter,
    authController.login
);

// Şifre sıfırlama akışı
router.post('/forgot-password', rateLimits.forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', rateLimits.resetPasswordLimiter, authController.resetPassword);

// Profilim
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updateMe);

module.exports = router;