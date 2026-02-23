const express = require('express');
const router = express.Router();
const { getAllOrders, getOrder, createOrder, updateOrder, deleteOrder } = require('../controllers/orderController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

router.get('/', getAllOrders);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

module.exports = router;
