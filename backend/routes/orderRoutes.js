const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Eski uç — doğrudan kart bilgisi alarak ödeme alıyordu. Yeni akış PayTR iFrame'dir
 * (POST /api/payments/create-payment). Bu uç 410 Gone döndürür; eski istemciler
 * bilgilendirilsin diye route korunuyor.
 */
router.post('/', authMiddleware.optionalProtect, orderController.createOrder);

// Giriş zorunlu: sadece hesabın siparişleri
router.get('/me', authMiddleware.protect, orderController.listMyOrders);

// --- Bundan sonrası yalnızca admin ---
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/stats', orderController.getDashboardStats);
router.get('/export/csv', orderController.exportOrdersCsv);
router.get('/', orderController.getAllOrders);
router.post('/:id/ship', orderController.shipOrder);
router.put('/:id', orderController.updateOrderStatus);

module.exports = router;
