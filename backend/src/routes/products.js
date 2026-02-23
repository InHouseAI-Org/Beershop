const express = require('express');
const router = express.Router();
const { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// GET routes are accessible to all authenticated users (needed for sales form)
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Write operations require admin role
router.post('/', adminOnly, createProduct);
router.put('/:id', adminOnly, updateProduct);
router.delete('/:id', adminOnly, deleteProduct);

module.exports = router;
