const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
    createPaytrPaymentInitialize,
    handlePaytrNotification,
    cancelPendingPayment,
} = require('../controllers/paytrCheckoutPaymentController');

const router = express.Router();

/**
 * Ödeme başlat (PayTR iFrame token).
 */
router.post('/create-payment', authMiddleware.optionalProtect, createPaytrPaymentInitialize);
router.post('/cancel-pending', authMiddleware.optionalProtect, cancelPendingPayment);

/**
 * PayTR bildirim URL — panelden kayıt edilmelidir.
 * Mutlak adres: {BACKEND_PUBLIC_URL}/api/payments/paytr-notification
 */
router.post('/paytr-notification', handlePaytrNotification);

module.exports = router;
