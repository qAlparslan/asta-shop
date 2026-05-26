const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auditLogController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.use(protect, restrictTo('admin'));
router.get('/', ctrl.list);

module.exports = router;
