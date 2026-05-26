const express = require('express');
const multer = require('multer'); // DOSYA YÜKLEME KÜTÜPHANESİ
const path = require('path');
const productController = require('../controllers/productController');
const productEngagementController = require('../controllers/productEngagementController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimits = require('../middlewares/rateLimits');
const fs = require('fs');

const router = express.Router();

// Multer'ın 'uploads/' gibi göreli yolu process.cwd()'ye göre çözmesi, sunucuyu farklı
// dizinden başlatınca express tarafındaki statik klasör (backend/uploads) ile uyuşmaz;
// ürün görselleri DB'de /uploads/... görünür ama dosya yanlış klasörde kalır. Her zaman backend/uploads.
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- MULTER YAPILANDIRMASI (Görseller Nereye Kaydedilecek?) ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Aynı isimli dosyalar çakışmasın diye başına tarih ekliyoruz
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage: storage });

// CSV içe aktarma için bellek tabanlı küçük yükleyici (5MB)
const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok =
            /\.csv$/i.test(file.originalname) ||
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/plain';
        cb(ok ? null : new Error('Sadece .csv uzantılı dosya kabul edilir.'), ok);
    },
});


// --- HERKESE AÇIK (MÜŞTERİ) ROTALARI ---
router.get('/', productController.getAllProducts);
router.post(
    '/generate-seo',
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    productController.generateSeoPreview,
);
router.get('/slug/:slug', productController.getProductBySlug); // BİZİM EKLENTİMİZ
router.get('/id/:id', productController.getPublicProductById);
router.get('/:id/reviews', productEngagementController.listReviews);
router.post(
    '/:id/reviews',
    rateLimits.productReviewPostLimiter,
    authMiddleware.optionalProtect,
    productEngagementController.createReview
);
router.post(
    '/:id/stock-alert',
    rateLimits.productStockAlertPostLimiter,
    productEngagementController.subscribeStockAlert
);
router.get(
    '/all-admin',
    authMiddleware.protect,
    authMiddleware.restrictTo('admin'),
    productController.getAllProductsAdmin
);
router.get('/:id', productController.getProductById);

// --- 🛑 GÜVENLİK DUVARI BAŞLANGICI 🛑 ---
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

// --- SADECE ADMİN'E AÇIK ROTALAR ---
router.post('/bulk-action', productController.bulkActions); // <-- YENİ EKLENEN TOPLU İŞLEM ROTASI
router.post('/import', csvUpload.single('file'), productController.importProducts);
router.patch('/:id/visibility', productController.patchProductVisibility);
router.post('/', upload.array('images', 5), productController.createProduct);
router.put('/:id', upload.array('images', 5), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;