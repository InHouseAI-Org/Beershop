const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const {
  getAllMiscellaneousIncome,
  createMiscellaneousIncome,
  deleteMiscellaneousIncome
} = require('../controllers/miscellaneousIncomeController');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// GET /api/miscellaneous-income - Get all miscellaneous income records for the organisation
router.get('/', getAllMiscellaneousIncome);

// POST /api/miscellaneous-income - Create a new miscellaneous income record
router.post('/', createMiscellaneousIncome);

// DELETE /api/miscellaneous-income/:id - Delete a miscellaneous income record
router.delete('/:id', deleteMiscellaneousIncome);

module.exports = router;
