const express = require('express');
const ctrl = require('../controllers/homeHeroController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', ctrl.listPublic);

router.use(auth.protect, auth.restrictTo('admin'));

router.get('/manage', ctrl.listAll);
router.post('/', ctrl.create);
router.put('/reorder', ctrl.reorder);
router.post('/upload-bg', ctrl.uploadHeroBgMiddleware, ctrl.uploadBg);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
