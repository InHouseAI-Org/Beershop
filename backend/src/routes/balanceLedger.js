const express = require('express');
const router = express.Router();
const balanceLedgerController = require('../controllers/balanceLedgerController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get ledger for specific balance (cash/bank/gala)
// Query params: start_date, end_date (optional)
router.get('/:balanceType/ledger', balanceLedgerController.getBalanceLedger);

// Get summary for specific balance type
router.get('/:balanceType/summary', balanceLedgerController.getBalanceSummary);

// Get all transactions for organization (across all balances)
router.get('/transactions', balanceLedgerController.getAllTransactions);

module.exports = router;
