const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { orderCancelLimiter } = require('../middlewares/rateLimits');

const router = express.Router();

const invoicesDir = path.join(__dirname, '..', 'uploads', 'invoices');
if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
}

const invoicePdfUpload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, invoicesDir),
        filename: (req, file, cb) => {
            const base = String(req.params.id || 'order').replace(/[^\w-]/g, '');
            const ext = path.extname(file.originalname || '').toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
            cb(null, `${base}-${Date.now()}${ext}`);
        },
    }),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype === 'application/pdf' ||
            String(file.originalname || '')
                .toLowerCase()
                .endsWith('.pdf');
        if (ok) cb(null, true);
        else cb(new Error('Yalnızca PDF dosyası yüklenebilir.'));
    },
});

/**
 * Eski uç — doğrudan kart bilgisi alarak ödeme alıyordu. Yeni akış PayTR iFrame'dir
 * (POST /api/payments/create-payment). Bu uç 410 Gone döndürür; eski istemciler
 * bilgilendirilsin diye route korunuyor.
 */
router.post('/', authMiddleware.optionalProtect, orderController.createOrder);

// Giriş zorunlu: sadece hesabın siparişleri
router.get('/me', authMiddleware.protect, orderController.listMyOrders);
router.post(
    '/me/:id/cancel',
    authMiddleware.protect,
    orderCancelLimiter,
    orderController.cancelMyOrder,
);

// --- Bundan sonrası yalnızca admin ---
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/stats/v2', orderController.getDashboardStatsV2);
router.get('/stats', orderController.getDashboardStats);
router.get('/export/csv', orderController.exportOrdersCsv);
router.get('/', orderController.getAllOrders);
router.post('/:id/ship', orderController.shipOrder);
router.post(
    '/:id/invoice-pdf',
    invoicePdfUpload.single('invoice'),
    orderController.uploadOrderInvoicePdf,
);
router.put('/:id', orderController.updateOrderStatus);

module.exports = router;
