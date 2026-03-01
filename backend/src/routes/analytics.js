const express = require('express');
const router = express.Router();
const { getMonthlyAnalytics } = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/monthly', getMonthlyAnalytics);

module.exports = router;
