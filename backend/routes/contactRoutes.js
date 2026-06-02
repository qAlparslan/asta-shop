const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contactController');
const { contactMessageLimiter } = require('../middlewares/rateLimits');

// Public — iletişim formu
router.post('/', contactMessageLimiter, ctrl.submit);

module.exports = router;
