const db = require('../models/data');

// Create new expense
const createExpense = async (req, res) => {
  try {
    const { expenseName, description, expenseFrom, expenseAmount, date } = req.body;
    const organisationId = req.user.organisationId;

    if (!expenseName || !expenseFrom || !expenseAmount) {
      return res.status(400).json({
        error: 'Please provide expenseName, expenseFrom, and expenseAmount'
      });
    }

    // Validate expenseFrom enum
    const validExpenseFrom = ['cash_balance', 'bank_balance', 'gala_balance'];
    if (!validExpenseFrom.includes(expenseFrom)) {
      return res.status(400).json({
        error: 'expenseFrom must be one of: cash_balance, bank_balance, gala_balance'
      });
    }

    // Validate expenseAmount is positive
    const amount = parseFloat(expenseAmount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'expenseAmount must be greater than 0' });
    }

    // Get current organisation balances to check if sufficient funds are available
    const orgBalances = await db.getOrganisationBalances(organisationId);
    if (!orgBalances) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Check if sufficient balance is available
    let currentBalance = 0;
    let balanceName = '';
    if (expenseFrom === 'cash_balance') {
      currentBalance = parseFloat(orgBalances.cash_balance || 0);
      balanceName = 'Cash Balance';
    } else if (expenseFrom === 'bank_balance') {
      currentBalance = parseFloat(orgBalances.bank_balance || 0);
      balanceName = 'Bank Balance';
    } else if (expenseFrom === 'gala_balance') {
      currentBalance = parseFloat(orgBalances.gala_balance || 0);
      balanceName = 'Gala Balance';
    }

    if (amount > currentBalance) {
      return res.status(400).json({
        error: `Insufficient ${balanceName}. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${amount.toFixed(2)}`
      });
    }

    const expense = await db.createExpense({
      organisationId,
      expenseName,
      description,
      expenseFrom,
      expenseAmount: amount,
      date
    });

    // Deduct expense amount from the selected balance
    const balanceUpdate = {};
    if (expenseFrom === 'cash_balance') {
      balanceUpdate.cashBalance = -amount;
    } else if (expenseFrom === 'bank_balance') {
      balanceUpdate.bankBalance = -amount;
    } else if (expenseFrom === 'gala_balance') {
      balanceUpdate.galaBalance = -amount;
    }
    await db.incrementOrganisationBalances(organisationId, balanceUpdate);

    res.status(201).json({
      ...expense,
      previousBalance: currentBalance,
      newBalance: currentBalance - amount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all expenses for an organisation
const getExpenses = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const expenses = await db.getExpensesByOrganisationId(organisationId);
    res.json(expenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single expense
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await db.getExpenseById(id);

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { expenseName, description, expenseFrom, expenseAmount, date } = req.body;
    const organisationId = req.user.organisationId;

    // Get the existing expense first
    const existingExpense = await db.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if expense belongs to user's organisation
    if (existingExpense.organisation_id !== organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (expenseName) updates.expenseName = expenseName;
    if (description !== undefined) updates.description = description;
    if (date) updates.date = date;

    // Handle balance changes if expenseFrom or expenseAmount changed
    const oldAmount = parseFloat(existingExpense.expense_amount || 0);
    const oldFrom = existingExpense.expense_from;
    const newAmount = expenseAmount !== undefined ? parseFloat(expenseAmount) : oldAmount;
    const newFrom = expenseFrom || oldFrom;

    // Validate new values
    if (expenseFrom) {
      const validExpenseFrom = ['cash_balance', 'bank_balance', 'gala_balance'];
      if (!validExpenseFrom.includes(expenseFrom)) {
        return res.status(400).json({
          error: 'expenseFrom must be one of: cash_balance, bank_balance, gala_balance'
        });
      }
      updates.expenseFrom = expenseFrom;
    }
    if (expenseAmount !== undefined) {
      if (newAmount <= 0) {
        return res.status(400).json({ error: 'expenseAmount must be greater than 0' });
      }
      updates.expenseAmount = newAmount;
    }

    // If amount or source changed, update balances
    if (expenseAmount !== undefined || expenseFrom) {
      // Get current organisation balances
      const orgBalances = await db.getOrganisationBalances(organisationId);
      if (!orgBalances) {
        return res.status(404).json({ error: 'Organisation not found' });
      }

      // First, add back the old expense amount to the old balance
      const addBackUpdate = {};
      if (oldFrom === 'cash_balance') {
        addBackUpdate.cashBalance = oldAmount;
      } else if (oldFrom === 'bank_balance') {
        addBackUpdate.bankBalance = oldAmount;
      } else if (oldFrom === 'gala_balance') {
        addBackUpdate.galaBalance = oldAmount;
      }
      await db.incrementOrganisationBalances(organisationId, addBackUpdate);

      // Get updated balances
      const updatedOrgBalances = await db.getOrganisationBalances(organisationId);

      // Check if sufficient balance for new expense
      let currentBalance = 0;
      let balanceName = '';
      if (newFrom === 'cash_balance') {
        currentBalance = parseFloat(updatedOrgBalances.cash_balance || 0);
        balanceName = 'Cash Balance';
      } else if (newFrom === 'bank_balance') {
        currentBalance = parseFloat(updatedOrgBalances.bank_balance || 0);
        balanceName = 'Bank Balance';
      } else if (newFrom === 'gala_balance') {
        currentBalance = parseFloat(updatedOrgBalances.gala_balance || 0);
        balanceName = 'Gala Balance';
      }

      if (newAmount > currentBalance) {
        // Rollback the add back
        const rollbackUpdate = {};
        if (oldFrom === 'cash_balance') {
          rollbackUpdate.cashBalance = -oldAmount;
        } else if (oldFrom === 'bank_balance') {
          rollbackUpdate.bankBalance = -oldAmount;
        } else if (oldFrom === 'gala_balance') {
          rollbackUpdate.galaBalance = -oldAmount;
        }
        await db.incrementOrganisationBalances(organisationId, rollbackUpdate);

        return res.status(400).json({
          error: `Insufficient ${balanceName}. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${newAmount.toFixed(2)}`
        });
      }

      // Deduct new expense amount from the new balance
      const deductUpdate = {};
      if (newFrom === 'cash_balance') {
        deductUpdate.cashBalance = -newAmount;
      } else if (newFrom === 'bank_balance') {
        deductUpdate.bankBalance = -newAmount;
      } else if (newFrom === 'gala_balance') {
        deductUpdate.galaBalance = -newAmount;
      }
      await db.incrementOrganisationBalances(organisationId, deductUpdate);
    }

    const updatedExpense = await db.updateExpense(id, updates);

    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get the existing expense first to refund the balance
    const existingExpense = await db.getExpenseById(id);
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Check if expense belongs to user's organisation
    if (existingExpense.organisation_id !== organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add back the expense amount to the balance before deleting
    const amount = parseFloat(existingExpense.expense_amount || 0);
    const expenseFrom = existingExpense.expense_from;

    const balanceUpdate = {};
    if (expenseFrom === 'cash_balance') {
      balanceUpdate.cashBalance = amount;
    } else if (expenseFrom === 'bank_balance') {
      balanceUpdate.bankBalance = amount;
    } else if (expenseFrom === 'gala_balance') {
      balanceUpdate.galaBalance = amount;
    }
    await db.incrementOrganisationBalances(organisationId, balanceUpdate);

    const success = await db.deleteExpense(id);

    if (!success) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};
