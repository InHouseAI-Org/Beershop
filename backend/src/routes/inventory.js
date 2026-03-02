const express = require('express');
const router = express.Router();
const { getAllInventory, getInventoryByProduct, updateInventory, createInventory } = require('../controllers/inventoryController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// GET routes accessible to all authenticated users
router.get('/', getAllInventory);
router.get('/product/:productId', getInventoryByProduct);

// Create and update require admin role
router.post('/', adminOnly, createInventory);
router.put('/:id', adminOnly, updateInventory);

module.exports = router;
