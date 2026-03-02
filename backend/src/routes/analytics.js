const express = require('express');
const router = express.Router();
const { getMonthlyAnalytics, getProductMonthlyOrders } = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/monthly', getMonthlyAnalytics);
router.get('/product/:productId/monthly-orders', getProductMonthlyOrders);

module.exports = router;
