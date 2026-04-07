const db = require('../models/data');
const pool = require('../config/database');

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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, description, amount, account, transactionDate } = req.body;
    const organisationId = req.user.organisationId;
    const username = req.user.username;

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

    const incomeDate = transactionDate || new Date().toISOString().split('T')[0];

    // Create balance_transaction entry
    await client.query(
      `INSERT INTO balance_transactions (
        organisation_id, transaction_type, account,
        debit_amount, credit_amount, transaction_date,
        description, notes, reference_id, reference_table, created_by_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        organisationId,
        'miscellaneous_income',
        account,
        0,
        incomeAmount,
        incomeDate,
        name,
        description,
        newIncome.id,
        'miscellaneous_income',
        username
      ]
    );

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

    await client.query('COMMIT');
    res.status(201).json(newIncome);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating miscellaneous income:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Delete a miscellaneous income record
 */
const deleteMiscellaneousIncome = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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

    // Delete balance_transaction entry
    await client.query(
      `DELETE FROM balance_transactions
       WHERE reference_id = $1 AND reference_table = 'miscellaneous_income'`,
      [id]
    );

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

    await client.query('COMMIT');
    res.json({ message: 'Income record deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting miscellaneous income:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllMiscellaneousIncome,
  createMiscellaneousIncome,
  deleteMiscellaneousIncome
};
