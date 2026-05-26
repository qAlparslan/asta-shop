const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/campaignController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { campaignMutationLimiter } = require('../middlewares/rateLimits');

router.use(protect, restrictTo('admin'));

router.get('/audience-stats', ctrl.audienceStats);
router.get('/template-variables', ctrl.templateVariables);
router.post('/preview', campaignMutationLimiter, ctrl.previewCampaign);
router.post('/test', campaignMutationLimiter, ctrl.sendTest);
router.get('/logs', ctrl.listLogs);

// Yeni kampanya yönetimi
router.get('/', ctrl.listCampaigns);
router.post('/', campaignMutationLimiter, ctrl.createCampaign);
router.get('/:id', ctrl.getCampaign);
router.post('/:id/send-now', campaignMutationLimiter, ctrl.sendNow);
router.post('/:id/cancel', campaignMutationLimiter, ctrl.cancelCampaign);

module.exports = router;
