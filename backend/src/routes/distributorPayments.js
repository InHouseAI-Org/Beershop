const express = require('express');
const router = express.Router();
const {
  getDistributorLedger,
  getUnpaidBills,
  makePayment,
  getPaymentHistory
} = require('../controllers/distributorPaymentsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get ledger for a distributor (orders + payments)
router.get('/:id/ledger', getDistributorLedger);

// Get unpaid bills for a distributor
router.get('/:id/unpaid-bills', getUnpaidBills);

// Make payment (order payment or advance)
router.post('/pay', makePayment);

// Get payment history for a distributor
router.get('/:id/payments', getPaymentHistory);

module.exports = router;
