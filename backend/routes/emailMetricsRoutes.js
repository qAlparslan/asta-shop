const express = require('express');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/emailMetricsController');

const router = express.Router();

router.use(protect, restrictTo('admin'));
router.get('/summary', ctrl.summary);

module.exports = router;
