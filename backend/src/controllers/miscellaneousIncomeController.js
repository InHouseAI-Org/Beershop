const db = require('../models/data');

/**
 * Get all miscellaneous income records for organization
 */
const getAllMiscellaneousIncome = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const incomeRecords = await db.getAllMiscellaneousIncome(organisationId);
    res.json(incomeRecords);
  } catch (error) {
    console.error('Error fetching miscellaneous income:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create a new miscellaneous income record
 */
const createMiscellaneousIncome = async (req, res) => {
  try {
    const { name, description, amount, account, transactionDate } = req.body;
    const organisationId = req.user.organisationId;

    // Validation
    if (!name || !amount || !account) {
      return res.status(400).json({ error: 'Name, amount, and account are required' });
    }

    const validAccounts = ['cash_balance', 'bank_balance', 'gala_balance'];
    if (!validAccounts.includes(account)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    const incomeAmount = parseFloat(amount);
    if (incomeAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Create the income record
    const createdBy = req.user.role === 'user' ? req.user.id : null;

    const newIncome = await db.createMiscellaneousIncome({
      organisationId,
      name,
      description,
      amount: incomeAmount,
      account,
      transactionDate: transactionDate || new Date(),
      createdBy,
      createdByUsername: req.user.username
    });

    // Update the organization balance - add income to the specified account
    const balanceUpdates = {};

    if (account === 'cash_balance') {
      balanceUpdates.cashBalance = incomeAmount;
    } else if (account === 'bank_balance') {
      balanceUpdates.bankBalance = incomeAmount;
    } else if (account === 'gala_balance') {
      balanceUpdates.galaBalance = incomeAmount;
    }

    await db.incrementOrganisationBalances(organisationId, balanceUpdates);

    res.status(201).json(newIncome);
  } catch (error) {
    console.error('Error creating miscellaneous income:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete a miscellaneous income record
 */
const deleteMiscellaneousIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get the income record to verify it exists and belongs to this organisation
    const income = await db.getMiscellaneousIncomeById(id);

    if (!income) {
      return res.status(404).json({ error: 'Income record not found' });
    }

    if (income.organisation_id !== organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Reverse the balance change - deduct the income from the account
    const amount = parseFloat(income.amount);
    const balanceUpdates = {};

    if (income.account === 'cash_balance') {
      balanceUpdates.cashBalance = -amount;
    } else if (income.account === 'bank_balance') {
      balanceUpdates.bankBalance = -amount;
    } else if (income.account === 'gala_balance') {
      balanceUpdates.galaBalance = -amount;
    }

    await db.incrementOrganisationBalances(organisationId, balanceUpdates);

    // Delete the income record
    await db.deleteMiscellaneousIncome(id);

    res.json({ message: 'Income record deleted successfully' });
  } catch (error) {
    console.error('Error deleting miscellaneous income:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getAllMiscellaneousIncome,
  createMiscellaneousIncome,
  deleteMiscellaneousIncome
};
