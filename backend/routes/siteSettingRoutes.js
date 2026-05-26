const express = require('express');
const ctrl = require('../controllers/siteSettingController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

// Public: site ayarları (front-end'in çoğu yerde okuduğu)
router.get('/', ctrl.getAll);

// Admin
router.use(auth.protect);
router.use(auth.restrictTo('admin'));

router.put('/', ctrl.updateMany);
router.post('/logo', ctrl.uploadMiddleware, ctrl.uploadLogo);

module.exports = router;
