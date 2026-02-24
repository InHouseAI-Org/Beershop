const express = require('express');
const router = express.Router();
const {
  createBalance,
  getBalances,
  getBalanceBySalesId,
  getOrganisationBalances,
  updateOrganisationBalances
} = require('../controllers/balanceController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Create or update balance for a sales entry
router.post('/', createBalance);

// Get all balances for organisation
router.get('/', getBalances);

// Get organisation balance summary
router.get('/organisation', getOrganisationBalances);

// Get balance for specific sales entry
router.get('/sales/:salesId', getBalanceBySalesId);

// Update organisation master balances
router.put('/organisation', updateOrganisationBalances);

module.exports = router;
