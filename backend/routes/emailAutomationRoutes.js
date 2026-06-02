const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/emailAutomationController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Tümü admin
router.use(protect, restrictTo('admin'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/run-now', ctrl.runNow);

module.exports = router;
