const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimits = require('../middlewares/rateLimits');
const cartInterestController = require('../controllers/cartInterestController');

const router = express.Router();

router.post(
    '/track-add',
    rateLimits.cartTrackLimiter,
    authMiddleware.optionalProtect,
    cartInterestController.trackAdd,
);
router.post(
    '/sync',
    rateLimits.cartTrackLimiter,
    authMiddleware.optionalProtect,
    cartInterestController.syncCart,
);

module.exports = router;
