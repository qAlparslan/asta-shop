const express = require('express');
const controller = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public
router.get('/', controller.listPublic);

// Admin
router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('admin'));

router.get('/all', controller.listAll);
router.post('/', controller.createCategory);
router.put('/:id', controller.updateCategory);
router.patch('/:id/move', controller.moveCategory);
router.delete('/:id', controller.deleteCategory);

module.exports = router;
