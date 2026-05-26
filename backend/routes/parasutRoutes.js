const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const parasutIntegrationController = require('../controllers/parasutIntegrationController');

const router = express.Router();

router.use(authMiddleware.protect, authMiddleware.restrictTo('admin'));

router.get('/ping', parasutIntegrationController.ping);
router.post('/orders/:orderId/e-invoice', parasutIntegrationController.submitOrderEInvoice);

module.exports = router;
