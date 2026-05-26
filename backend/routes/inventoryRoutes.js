const express = require('express');
const router = express.Router();
const wh = require('../controllers/warehouseController');
const inv = require('../controllers/inventoryController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.use(protect, restrictTo('admin'));

router.get('/low-stock', inv.lowStock);

router.get('/warehouses', wh.list);
router.post('/warehouses', wh.create);
router.put('/warehouses/:id', wh.update);
router.delete('/warehouses/:id', wh.delete);

router.get('/products/:productId/warehouse-stocks', wh.productStocks);
router.patch('/products/:productId/warehouse-stocks/:warehouseId', wh.patchProductStock);

module.exports = router;
