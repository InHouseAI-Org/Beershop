const pool = require('../config/database');

/**
 * Get all recurring expenses for organization
 */
const getAllRecurringExpenses = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const query = `
      SELECT * FROM recurring_expenses_summary
      WHERE organisation_id = $1
      ORDER BY
        CASE
          WHEN next_due_date IS NULL THEN 3
          WHEN next_due_date < CURRENT_DATE THEN 1
          WHEN next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
          ELSE 3
        END,
        next_due_date ASC NULLS LAST
    `;

    const result = await client.query(query, [organisationId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get single recurring expense with payment history
 */
const getRecurringExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    const expenseQuery = `
      SELECT * FROM recurring_expenses_summary
      WHERE id = $1 AND organisation_id = $2
    `;
    const expenseResult = await client.query(expenseQuery, [id, organisationId]);

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }

    // Get payment history
    const paymentsQuery = `
      SELECT
        rep.*,
        a.username as created_by_name
      FROM recurring_expense_payments rep
      LEFT JOIN admins a ON rep.created_by = a.id
      WHERE rep.recurring_expense_id = $1
      ORDER BY rep.payment_date DESC
    `;
    const paymentsResult = await client.query(paymentsQuery, [id]);

    res.json({
      ...expenseResult.rows[0],
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching recurring expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Create new recurring expense
 */
const createRecurringExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      expenseName,
      recurrenceType,
      recurrenceFrequency,
      expenseAmount,
      nextDueDate,
      notes
    } = req.body;

    const organisationId = req.user.organisationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!expenseName || !recurrenceType || !recurrenceFrequency || !expenseAmount) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Validate recurrence type
    if (!['weekly', 'monthly', 'yearly'].includes(recurrenceType)) {
      return res.status(400).json({ error: 'Invalid recurrence type' });
    }

    const insertQuery = `
      INSERT INTO recurring_expenses (
        organisation_id, expense_name, recurrence_type,
        recurrence_frequency, expense_amount, next_due_date,
        notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      organisationId,
      expenseName,
      recurrenceType,
      parseInt(recurrenceFrequency),
      parseFloat(expenseAmount),
      nextDueDate || null,
      notes || null,
      createdBy
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating recurring expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Update recurring expense
 */
const updateRecurringExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const organisationId = req.user.organisationId;

    const {
      expenseName,
      recurrenceType,
      recurrenceFrequency,
      expenseAmount,
      nextDueDate,
      isActive,
      notes
    } = req.body;

    // Verify expense belongs to organization
    const checkQuery = `SELECT * FROM recurring_expenses WHERE id = $1 AND organisation_id = $2`;
    const checkResult = await client.query(checkQuery, [id, organisationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }

    const updateQuery = `
      UPDATE recurring_expenses
      SET
        expense_name = COALESCE($1, expense_name),
        recurrence_type = COALESCE($2, recurrence_type),
        recurrence_frequency = COALESCE($3, recurrence_frequency),
        expense_amount = COALESCE($4, expense_amount),
        next_due_date = COALESCE($5, next_due_date),
        is_active = COALESCE($6, is_active),
        notes = COALESCE($7, notes)
      WHERE id = $8 AND organisation_id = $9
      RETURNING *
    `;

    const values = [
      expenseName,
      recurrenceType,
      recurrenceFrequency ? parseInt(recurrenceFrequency) : null,
      expenseAmount ? parseFloat(expenseAmount) : null,
      nextDueDate,
      isActive,
      notes,
      id,
      organisationId
    ];

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating recurring expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Delete recurring expense
 */
const deleteRecurringExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Verify expense belongs to organization
    const checkQuery = `SELECT * FROM recurring_expenses WHERE id = $1 AND organisation_id = $2`;
    const checkResult = await client.query(checkQuery, [id, organisationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }

    await client.query('DELETE FROM recurring_expenses WHERE id = $1', [id]);

    res.json({ message: 'Recurring expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Pay a recurring expense
 */
const payRecurringExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { paymentDate, paidFrom, amount, notes } = req.body;
    const organisationId = req.user.organisationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!paymentDate || !paidFrom) {
      return res.status(400).json({ error: 'Payment date and payment source are required' });
    }

    // Validate payment source
    if (!['cash_balance', 'bank_balance', 'gala_balance'].includes(paidFrom)) {
      return res.status(400).json({ error: 'Invalid payment source' });
    }

    // Get recurring expense
    const expenseQuery = `SELECT * FROM recurring_expenses WHERE id = $1 AND organisation_id = $2`;
    const expenseResult = await client.query(expenseQuery, [id, organisationId]);

    if (expenseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }

    const recurringExpense = expenseResult.rows[0];
    const paymentAmount = amount ? parseFloat(amount) : parseFloat(recurringExpense.expense_amount);

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Check if sufficient balance available
    const db = require('../models/data');
    const orgBalances = await db.getOrganisationBalances(organisationId);

    let currentBalance = 0;
    let balanceName = '';
    if (paidFrom === 'cash_balance') {
      currentBalance = parseFloat(orgBalances.cash_balance || 0);
      balanceName = 'Cash Balance';
    } else if (paidFrom === 'bank_balance') {
      currentBalance = parseFloat(orgBalances.bank_balance || 0);
      balanceName = 'Bank Balance';
    } else if (paidFrom === 'gala_balance') {
      currentBalance = parseFloat(orgBalances.gala_balance || 0);
      balanceName = 'Gala Balance';
    }

    if (paymentAmount > currentBalance) {
      return res.status(400).json({
        error: `Insufficient ${balanceName}. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${paymentAmount.toFixed(2)}`
      });
    }

    // Create the actual expense entry
    const expenseInsertQuery = `
      INSERT INTO expenses (
        organisation_id, expense_name, description, expense_from, expense_amount, date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const expenseValues = [
      organisationId,
      `${recurringExpense.expense_name} (Recurring)`,
      notes || `Recurring expense payment`,
      paidFrom,
      paymentAmount,
      paymentDate
    ];

    const expenseInsertResult = await client.query(expenseInsertQuery, expenseValues);
    const createdExpense = expenseInsertResult.rows[0];

    // Create payment record
    const paymentInsertQuery = `
      INSERT INTO recurring_expense_payments (
        organisation_id, recurring_expense_id, expense_id,
        payment_date, amount, paid_from, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const paymentValues = [
      organisationId,
      id,
      createdExpense.id,
      paymentDate,
      paymentAmount,
      paidFrom,
      notes || null,
      createdBy
    ];

    const paymentResult = await client.query(paymentInsertQuery, paymentValues);

    // Deduct from organization balance
    const balanceUpdate = {};
    if (paidFrom === 'cash_balance') {
      balanceUpdate.cashBalance = -paymentAmount;
    } else if (paidFrom === 'bank_balance') {
      balanceUpdate.bankBalance = -paymentAmount;
    } else if (paidFrom === 'gala_balance') {
      balanceUpdate.galaBalance = -paymentAmount;
    }
    await db.incrementOrganisationBalances(organisationId, balanceUpdate);

    // Calculate next due date
    let nextDueDate = new Date(paymentDate);
    switch (recurringExpense.recurrence_type) {
      case 'weekly':
        nextDueDate.setDate(nextDueDate.getDate() + (7 * recurringExpense.recurrence_frequency));
        break;
      case 'monthly':
        nextDueDate.setMonth(nextDueDate.getMonth() + recurringExpense.recurrence_frequency);
        break;
      case 'yearly':
        nextDueDate.setFullYear(nextDueDate.getFullYear() + recurringExpense.recurrence_frequency);
        break;
    }

    // Update next due date
    await client.query(
      `UPDATE recurring_expenses SET next_due_date = $1 WHERE id = $2`,
      [nextDueDate.toISOString().split('T')[0], id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: paymentResult.rows[0],
      expense: createdExpense,
      nextDueDate: nextDueDate.toISOString().split('T')[0],
      newBalance: currentBalance - paymentAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error paying recurring expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get payment history for a recurring expense
 */
const getPaymentHistory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    // Verify expense belongs to organization
    const checkQuery = `SELECT * FROM recurring_expenses WHERE id = $1 AND organisation_id = $2`;
    const checkResult = await client.query(checkQuery, [id, organisationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recurring expense not found' });
    }

    const query = `
      SELECT
        rep.*,
        a.username as created_by_name
      FROM recurring_expense_payments rep
      LEFT JOIN admins a ON rep.created_by = a.id
      WHERE rep.recurring_expense_id = $1
      ORDER BY rep.payment_date DESC
    `;

    const result = await client.query(query, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllRecurringExpenses,
  getRecurringExpense,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  payRecurringExpense,
  getPaymentHistory
};
