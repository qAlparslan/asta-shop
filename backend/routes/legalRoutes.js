const express = require('express');
const ctrl = require('../controllers/legalController');
const admin = require('../controllers/legalAdminController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/versions', ctrl.getVersions);
router.get('/content/:slug', ctrl.getContent);

router.get('/admin/bundle', auth.protect, auth.restrictTo('admin'), admin.getBundle);
router.put('/admin/bundle', auth.protect, auth.restrictTo('admin'), admin.putBundle);

module.exports = router;
