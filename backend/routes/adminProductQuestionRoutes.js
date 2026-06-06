const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const adminProductQuestionController = require('../controllers/adminProductQuestionController');

const router = express.Router();
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/', adminProductQuestionController.list);
router.patch('/:id', adminProductQuestionController.answer);

module.exports = router;
