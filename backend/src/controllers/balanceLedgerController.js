const pool = require('../config/database');
const { createTimer } = require('../utils/timing');

/**
 * Get complete ledger for a specific balance type (cash, bank, or gala)
 * Similar to distributor ledger - shows all transactions with running balance
 */
exports.getBalanceLedger = async (req, res) => {
  const timer = createTimer('GET /api/balance-ledger/:balanceType/ledger');
  const client = await pool.connect();
  try {
    const { balanceType } = req.params;
    const { start_date, end_date } = req.query;
    const organisationId = req.user.organisationId;

    // Validate balance type
    const validTypes = ['cash', 'bank', 'gala'];
    if (!validTypes.includes(balanceType)) {
      return res.status(400).json({
        error: 'Invalid balance type. Must be one of: cash, bank, gala'
      });
    }

    // Convert to database column name
    const accountColumn = `${balanceType}_balance`;
    const openingBalanceColumn = `${balanceType}_opening_balance`;

    // Get organisation and its opening balance
    const orgQuery = `
      SELECT id, ${openingBalanceColumn} as opening_balance
      FROM organisations
      WHERE id = $1
    `;
    const orgResult = await client.query(orgQuery, [organisationId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Start with the opening balance from the organisation table
    let openingBalance = parseFloat(orgResult.rows[0].opening_balance || 0);

    // If start_date is provided, add all transactions BEFORE start_date to the opening balance
    if (start_date) {
      const beforeStartQuery = `
        SELECT COALESCE(SUM(credit_amount - debit_amount), 0) as net_change
        FROM balance_transactions
        WHERE organisation_id = $1
          AND account = $2
          AND transaction_date < $3
      `;

      const beforeStartResult = await client.query(beforeStartQuery, [
        organisationId,
        accountColumn,
        start_date
      ]);

      const netChange = parseFloat(beforeStartResult.rows[0].net_change || 0);
      openingBalance += netChange;
    }

    // If no start_date is provided, opening balance is just the organisation's opening balance
    // (transactions will show from the beginning)

    // Build the transactions query
    let transactionsQuery = `
      SELECT
        id,
        transaction_type,
        account,
        transaction_date,
        description,
        notes,
        debit_amount,
        credit_amount,
        (credit_amount - debit_amount) as net_amount,
        reference_id,
        reference_table,
        created_by_username,
        created_at
      FROM balance_transactions
      WHERE organisation_id = $1
        AND account = $2
    `;

    const queryParams = [organisationId, accountColumn];
    let paramIndex = 3;

    // Add date filters if provided
    if (start_date) {
      transactionsQuery += ` AND transaction_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      transactionsQuery += ` AND transaction_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    transactionsQuery += `
      ORDER BY transaction_date ASC, created_at ASC
    `;

    const transactionsResult = await timer.measureDb(() => client.query(transactionsQuery, queryParams));

    // Calculate running balance for each transaction
    let runningBalance = openingBalance;
    const transactions = transactionsResult.rows.map(transaction => {
      const debit = parseFloat(transaction.debit_amount || 0);
      const credit = parseFloat(transaction.credit_amount || 0);
      const netAmount = credit - debit;

      runningBalance += netAmount;

      return {
        ...transaction,
        debit_amount: debit,
        credit_amount: credit,
        net_amount: netAmount,
        running_balance: runningBalance
      };
    });

    const closingBalance = runningBalance;

    timer.finish();
    res.json({
      balanceType,
      openingBalance: parseFloat(openingBalance.toFixed(2)),
      closingBalance: parseFloat(closingBalance.toFixed(2)),
      transactions,
      totalTransactions: transactions.length,
      dateRange: {
        start: start_date || null,
        end: end_date || null
      }
    });

  } catch (error) {
    timer.finish();
    console.error('Error fetching balance ledger:', error);
    res.status(500).json({
      error: 'Failed to fetch balance ledger',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get summary statistics for a specific balance type
 */
exports.getBalanceSummary = async (req, res) => {
  const client = await pool.connect();
  try {
    const { balanceType } = req.params;
    const { start_date, end_date } = req.query;
    const organisationId = req.user.organisationId;

    // Validate balance type
    const validTypes = ['cash', 'bank', 'gala'];
    if (!validTypes.includes(balanceType)) {
      return res.status(400).json({
        error: 'Invalid balance type. Must be one of: cash, bank, gala'
      });
    }

    const accountColumn = `${balanceType}_balance`;
    const openingBalanceColumn = `${balanceType}_opening_balance`;

    // Get current balance and opening balance
    const balanceQuery = `
      SELECT
        ${accountColumn} as current_balance,
        ${openingBalanceColumn} as opening_balance
      FROM organisations
      WHERE id = $1
    `;
    const balanceResult = await client.query(balanceQuery, [organisationId]);

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    const { current_balance, opening_balance } = balanceResult.rows[0];

    // Build summary query with date filters
    let summaryQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(debit_amount), 0) as total_debits,
        COALESCE(SUM(credit_amount), 0) as total_credits,
        COALESCE(SUM(credit_amount - debit_amount), 0) as net_change
      FROM balance_transactions
      WHERE organisation_id = $1
        AND account = $2
    `;

    const queryParams = [organisationId, accountColumn];
    let paramIndex = 3;

    if (start_date) {
      summaryQuery += ` AND transaction_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      summaryQuery += ` AND transaction_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    const summaryResult = await client.query(summaryQuery, queryParams);
    const summary = summaryResult.rows[0];

    // Get transaction breakdown by type
    let breakdownQuery = `
      SELECT
        transaction_type,
        COUNT(*) as count,
        COALESCE(SUM(debit_amount), 0) as total_debits,
        COALESCE(SUM(credit_amount), 0) as total_credits,
        COALESCE(SUM(credit_amount - debit_amount), 0) as net_amount
      FROM balance_transactions
      WHERE organisation_id = $1
        AND account = $2
    `;

    const breakdownParams = [organisationId, accountColumn];
    let breakdownParamIndex = 3;

    if (start_date) {
      breakdownQuery += ` AND transaction_date >= $${breakdownParamIndex}`;
      breakdownParams.push(start_date);
      breakdownParamIndex++;
    }

    if (end_date) {
      breakdownQuery += ` AND transaction_date <= $${breakdownParamIndex}`;
      breakdownParams.push(end_date);
      breakdownParamIndex++;
    }

    breakdownQuery += `
      GROUP BY transaction_type
      ORDER BY net_amount DESC
    `;

    const breakdownResult = await client.query(breakdownQuery, breakdownParams);

    res.json({
      balanceType,
      currentBalance: parseFloat(current_balance || 0),
      openingBalance: parseFloat(opening_balance || 0),
      summary: {
        totalTransactions: parseInt(summary.total_transactions),
        totalDebits: parseFloat(summary.total_debits),
        totalCredits: parseFloat(summary.total_credits),
        netChange: parseFloat(summary.net_change)
      },
      breakdown: breakdownResult.rows.map(row => ({
        transactionType: row.transaction_type,
        count: parseInt(row.count),
        totalDebits: parseFloat(row.total_debits),
        totalCredits: parseFloat(row.total_credits),
        netAmount: parseFloat(row.net_amount)
      })),
      dateRange: {
        start: start_date || null,
        end: end_date || null
      }
    });

  } catch (error) {
    console.error('Error fetching balance summary:', error);
    res.status(500).json({
      error: 'Failed to fetch balance summary',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get all transactions across all balance types for the organization
 */
exports.getAllTransactions = async (req, res) => {
  const client = await pool.connect();
  try {
    const { start_date, end_date, transaction_type, account } = req.query;
    const organisationId = req.user.organisationId;

    let query = `
      SELECT
        id,
        transaction_type,
        account,
        transaction_date,
        description,
        notes,
        debit_amount,
        credit_amount,
        (credit_amount - debit_amount) as net_amount,
        reference_id,
        reference_table,
        created_by_username,
        created_at
      FROM balance_transactions
      WHERE organisation_id = $1
    `;

    const queryParams = [organisationId];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND transaction_date >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND transaction_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    if (transaction_type) {
      query += ` AND transaction_type = $${paramIndex}`;
      queryParams.push(transaction_type);
      paramIndex++;
    }

    if (account) {
      query += ` AND account = $${paramIndex}`;
      queryParams.push(account);
      paramIndex++;
    }

    query += `
      ORDER BY transaction_date DESC, created_at DESC
      LIMIT 1000
    `;

    const result = await client.query(query, queryParams);

    const transactions = result.rows.map(transaction => ({
      ...transaction,
      debit_amount: parseFloat(transaction.debit_amount || 0),
      credit_amount: parseFloat(transaction.credit_amount || 0),
      net_amount: parseFloat(transaction.net_amount || 0)
    }));

    // Calculate totals
    const totals = transactions.reduce(
      (acc, txn) => {
        acc.totalDebits += txn.debit_amount;
        acc.totalCredits += txn.credit_amount;
        acc.netAmount += txn.net_amount;
        return acc;
      },
      { totalDebits: 0, totalCredits: 0, netAmount: 0 }
    );

    res.json({
      transactions,
      totalTransactions: transactions.length,
      totals: {
        totalDebits: parseFloat(totals.totalDebits.toFixed(2)),
        totalCredits: parseFloat(totals.totalCredits.toFixed(2)),
        netAmount: parseFloat(totals.netAmount.toFixed(2))
      },
      filters: {
        start_date: start_date || null,
        end_date: end_date || null,
        transaction_type: transaction_type || null,
        account: account || null
      }
    });

  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message
    });
  } finally {
    client.release();
  }
};
