const express = require('express');
const router = express.Router();
const tcsLedgerController = require('../controllers/tcsLedgerController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get TCS ledger
router.get('/', tcsLedgerController.getTCSLedger);

module.exports = router;
