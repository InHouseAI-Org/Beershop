const express = require('express');
const router = express.Router();
const tdsLedgerController = require('../controllers/tdsLedgerController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get TDS ledger
router.get('/', tdsLedgerController.getTDSLedger);

module.exports = router;
