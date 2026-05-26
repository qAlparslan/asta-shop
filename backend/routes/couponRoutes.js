const express = require('express');
const couponController = require('../controllers/couponController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Müşteriye açık (Sepette kodu denemek için)
router.post('/validate', couponController.validateCoupon);

// Sadece Admin'e açık rotalar
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/', couponController.getAllCoupons);
router.post('/', couponController.createCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;