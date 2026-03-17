const express = require('express');
const router = express.Router();
const prepaidExpensesController = require('../controllers/prepaidExpensesController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// Run daily amortization (cron job - no auth required when called by Vercel Cron)
// This must be BEFORE the auth middleware
router.post('/amortize/daily', prepaidExpensesController.runDailyAmortization);

// All other routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all prepaid expenses
router.get('/', prepaidExpensesController.getAllPrepaidExpenses);

// Get total prepaid value (for balance sheet)
router.get('/total-value', prepaidExpensesController.getTotalPrepaidExpensesValue);

// Get single prepaid expense
router.get('/:id', prepaidExpensesController.getPrepaidExpenseById);

// Create prepaid expense (pay in advance)
router.post('/', prepaidExpensesController.createPrepaidExpense);

module.exports = router;
