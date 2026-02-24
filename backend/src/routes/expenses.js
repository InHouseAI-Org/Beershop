const express = require('express');
const router = express.Router();
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Create new expense
router.post('/', createExpense);

// Get all expenses for organisation
router.get('/', getExpenses);

// Get single expense
router.get('/:id', getExpenseById);

// Update expense
router.put('/:id', updateExpense);

// Delete expense
router.delete('/:id', deleteExpense);

module.exports = router;
