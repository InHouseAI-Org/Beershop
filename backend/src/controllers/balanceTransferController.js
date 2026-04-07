const db = require('../models/data');
const pool = require('../config/database');

const getAllBalanceTransfers = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const transfers = await db.getAllBalanceTransfers(organisationId);
    res.json(transfers);
  } catch (error) {
    console.error('Error fetching balance transfers:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createBalanceTransfer = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, description, amount, fromAccount, toAccount, transactionDate } = req.body;
    const organisationId = req.user.organisationId;
    const username = req.user.username;

    // Validation
    if (!name || !amount || !fromAccount || !toAccount) {
      return res.status(400).json({ error: 'Name, amount, from account, and to account are required' });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({ error: 'From account and to account must be different' });
    }

    const validAccounts = ['cash_balance', 'bank_balance', 'gala_balance'];
    if (!validAccounts.includes(fromAccount) || !validAccounts.includes(toAccount)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if from account has sufficient balance
    const balances = await db.getOrganisationBalances(organisationId);
    const fromBalance = parseFloat(balances[fromAccount] || 0);

    if (fromBalance < transferAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient balance in ${fromAccount.replace('_', ' ')}. Available: ₹${fromBalance.toFixed(2)}, Required: ₹${transferAmount.toFixed(2)}`
      });
    }

    // Create the transfer record
    // Note: Super admins and regular admins don't have entries in the users table, so set createdBy to null for them
    // Only regular users (role === 'user') have entries in the users table
    const createdBy = req.user.role === 'user' ? req.user.id : null;

    const newTransfer = await db.createBalanceTransfer({
      organisationId,
      name,
      description,
      amount: transferAmount,
      fromAccount,
      toAccount,
      transactionDate: transactionDate || new Date(),
      createdBy,
      createdByUsername: req.user.username
    });

    const transferDate = transactionDate || new Date().toISOString().split('T')[0];

    // Create balance_transaction entry for debit (money going out)
    await client.query(
      `INSERT INTO balance_transactions (
        organisation_id, transaction_type, account,
        debit_amount, credit_amount, transaction_date,
        description, notes, reference_id, reference_table, created_by_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        organisationId,
        'balance_transfer_debit',
        fromAccount,
        transferAmount,
        0,
        transferDate,
        `Transfer to ${toAccount.replace('_balance', '')}${name ? ' - ' + name : ''}`,
        description,
        newTransfer.id,
        'balance_transfers',
        username
      ]
    );

    // Create balance_transaction entry for credit (money coming in)
    await client.query(
      `INSERT INTO balance_transactions (
        organisation_id, transaction_type, account,
        debit_amount, credit_amount, transaction_date,
        description, notes, reference_id, reference_table, created_by_username
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        organisationId,
        'balance_transfer_credit',
        toAccount,
        0,
        transferAmount,
        transferDate,
        `Transfer from ${fromAccount.replace('_balance', '')}${name ? ' - ' + name : ''}`,
        description,
        newTransfer.id,
        'balance_transfers',
        username
      ]
    );

    // Update balances: deduct from source, add to destination
    const balanceUpdates = {};

    // Deduct from source
    if (fromAccount === 'cash_balance') {
      balanceUpdates.cashBalance = -transferAmount;
    } else if (fromAccount === 'bank_balance') {
      balanceUpdates.bankBalance = -transferAmount;
    } else if (fromAccount === 'gala_balance') {
      balanceUpdates.galaBalance = -transferAmount;
    }

    // Add to destination
    if (toAccount === 'cash_balance') {
      balanceUpdates.cashBalance = (balanceUpdates.cashBalance || 0) + transferAmount;
    } else if (toAccount === 'bank_balance') {
      balanceUpdates.bankBalance = (balanceUpdates.bankBalance || 0) + transferAmount;
    } else if (toAccount === 'gala_balance') {
      balanceUpdates.galaBalance = (balanceUpdates.galaBalance || 0) + transferAmount;
    }

    await db.incrementOrganisationBalances(organisationId, balanceUpdates);

    await client.query('COMMIT');
    res.status(201).json(newTransfer);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating balance transfer:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

const deleteBalanceTransfer = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Get the transfer to verify it exists and belongs to this organisation
    const transfer = await db.getBalanceTransferById(id);

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (transfer.organisation_id !== organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete balance_transaction entries (both debit and credit)
    await client.query(
      `DELETE FROM balance_transactions
       WHERE reference_id = $1 AND reference_table = 'balance_transfers'`,
      [id]
    );

    // Reverse the balance changes
    const amount = parseFloat(transfer.amount);
    const balanceUpdates = {};

    // Add back to source (reverse the deduction)
    if (transfer.from_account === 'cash_balance') {
      balanceUpdates.cashBalance = amount;
    } else if (transfer.from_account === 'bank_balance') {
      balanceUpdates.bankBalance = amount;
    } else if (transfer.from_account === 'gala_balance') {
      balanceUpdates.galaBalance = amount;
    }

    // Deduct from destination (reverse the addition)
    if (transfer.to_account === 'cash_balance') {
      balanceUpdates.cashBalance = (balanceUpdates.cashBalance || 0) - amount;
    } else if (transfer.to_account === 'bank_balance') {
      balanceUpdates.bankBalance = (balanceUpdates.bankBalance || 0) - amount;
    } else if (transfer.to_account === 'gala_balance') {
      balanceUpdates.galaBalance = (balanceUpdates.galaBalance || 0) - amount;
    }

    await db.incrementOrganisationBalances(organisationId, balanceUpdates);

    // Delete the transfer record
    await db.deleteBalanceTransfer(id);

    await client.query('COMMIT');
    res.json({ message: 'Transfer deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting balance transfer:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllBalanceTransfers,
  createBalanceTransfer,
  deleteBalanceTransfer
};
