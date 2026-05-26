const express = require('express');
const ctrl = require('../controllers/mailWebhookController');

const router = express.Router();
router.use(express.json({ limit: '512kb' }));
router.post('/', ctrl.ingestFeedback);

module.exports = router;
