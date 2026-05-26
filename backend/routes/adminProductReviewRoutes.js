const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const adminProductReviewController = require('../controllers/adminProductReviewController');

const router = express.Router();
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/', adminProductReviewController.list);
router.patch('/:id', adminProductReviewController.updateApproval);

module.exports = router;
