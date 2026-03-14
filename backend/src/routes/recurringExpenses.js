const express = require('express');
const router = express.Router();
const recurringExpensesController = require('../controllers/recurringExpensesController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all recurring expenses for organization
router.get('/', recurringExpensesController.getAllRecurringExpenses);

// Get single recurring expense with payment history
router.get('/:id', recurringExpensesController.getRecurringExpense);

// Create new recurring expense
router.post('/', recurringExpensesController.createRecurringExpense);

// Update recurring expense
router.put('/:id', recurringExpensesController.updateRecurringExpense);

// Delete recurring expense
router.delete('/:id', recurringExpensesController.deleteRecurringExpense);

// Pay a recurring expense
router.post('/:id/pay', recurringExpensesController.payRecurringExpense);

// Get payment history for a recurring expense
router.get('/:id/payments', recurringExpensesController.getPaymentHistory);

module.exports = router;
