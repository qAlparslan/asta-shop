const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consentController');
const { consentEventLimiter } = require('../middlewares/rateLimits');

router.post('/events', consentEventLimiter, ctrl.recordEvent);

module.exports = router;
