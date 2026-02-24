const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const {
  getAllBalanceTransfers,
  createBalanceTransfer,
  deleteBalanceTransfer
} = require('../controllers/balanceTransferController');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// GET /api/balance-transfers - Get all balance transfers for the organisation
router.get('/', getAllBalanceTransfers);

// POST /api/balance-transfers - Create a new balance transfer
router.post('/', createBalanceTransfer);

// DELETE /api/balance-transfers/:id - Delete a balance transfer
router.delete('/:id', deleteBalanceTransfer);

module.exports = router;
