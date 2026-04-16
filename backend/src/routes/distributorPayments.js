const express = require('express');
const router = express.Router();
const {
  getDistributorLedger,
  getUnpaidBills,
  getOpeningBalanceLimit,
  makePayment,
  getPaymentHistory,
  deletePayment
} = require('../controllers/distributorPaymentsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get ledger for a distributor (orders + payments)
router.get('/:id/ledger', getDistributorLedger);

// Get unpaid bills for a distributor
router.get('/:id/unpaid-bills', getUnpaidBills);

// Get opening balance payment limit for a distributor
router.get('/:id/opening-balance-limit', getOpeningBalanceLimit);

// Make payment (order payment, advance, or opening balance payment)
router.post('/pay', makePayment);

// Get payment history for a distributor
router.get('/:id/payments', getPaymentHistory);

// Delete a payment
router.delete('/payment/:id', deletePayment);

module.exports = router;
