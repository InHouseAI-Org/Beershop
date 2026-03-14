const express = require('express');
const router = express.Router();
const balanceSheetController = require('../controllers/balanceSheetController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

router.get('/', balanceSheetController.getBalanceSheet);

module.exports = router;
