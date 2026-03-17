const pool = require('../config/database');

/**
 * Create a prepaid expense (pay in advance)
 */
const createPrepaidExpense = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const organisationId = req.user.organisationId;
    const {
      recurringExpenseId,
      paymentDate,
      paidFrom,
      advancePeriods,
      periodType
    } = req.body;

    // Validation
    if (!recurringExpenseId || !paymentDate || !paidFrom || !advancePeriods || !periodType) {
      return res.status(400).json({
        error: 'Please provide all required fields: recurringExpenseId, paymentDate, paidFrom, advancePeriods, periodType'
      });
    }

    if (!['cash_balance', 'bank_balance', 'gala_balance'].includes(paidFrom)) {
      return res.status(400).json({ error: 'Invalid paidFrom value' });
    }

    if (!['weeks', 'months', 'years'].includes(periodType)) {
      return res.status(400).json({ error: 'Invalid periodType. Must be weeks, months, or years' });
    }

    if (advancePeriods <= 0) {
      return res.status(400).json({ error: 'advancePeriods must be greater than 0' });
    }

    // Get recurring expense details
    const recurringExpenseQuery = `
      SELECT * FROM recurring_expenses
      WHERE id = $1 AND organisation_id = $2 AND is_active = true
    `;
    const recurringExpenseResult = await client.query(recurringExpenseQuery, [
      recurringExpenseId,
      organisationId
    ]);

    if (recurringExpenseResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recurring expense not found or not active' });
    }

    const recurringExpense = recurringExpenseResult.rows[0];
    const amountPerPeriod = parseFloat(recurringExpense.expense_amount);

    // Validate period type matches recurring expense type
    const expectedPeriodType = recurringExpense.recurrence_type === 'weekly' ? 'weeks' :
                                recurringExpense.recurrence_type === 'monthly' ? 'months' :
                                'years';

    if (periodType !== expectedPeriodType) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Period type must be '${expectedPeriodType}' to match the recurring expense type`
      });
    }

    // Calculate total amount
    const totalAmount = amountPerPeriod * advancePeriods;

    // Check if organization has sufficient balance
    const orgQuery = 'SELECT * FROM organisations WHERE id = $1';
    const orgResult = await client.query(orgQuery, [organisationId]);
    const org = orgResult.rows[0];

    const currentBalance = parseFloat(org[paidFrom] || 0);
    if (currentBalance < totalAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient balance. Required: ₹${totalAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}`
      });
    }

    // Calculate coverage dates based on the next_due_date from recurring expense
    // This ensures alignment with the actual expense cycle
    const nextDueDate = recurringExpense.next_due_date ? new Date(recurringExpense.next_due_date) : new Date(paymentDate);

    const coverageStartDate = new Date(nextDueDate);
    const coverageEndDate = new Date(coverageStartDate);

    // Calculate end date based on recurrence
    const frequency = parseInt(recurringExpense.recurrence_frequency);

    if (periodType === 'weeks') {
      coverageEndDate.setDate(coverageEndDate.getDate() + (advancePeriods * frequency * 7) - 1);
    } else if (periodType === 'months') {
      coverageEndDate.setMonth(coverageEndDate.getMonth() + (advancePeriods * frequency));
      coverageEndDate.setDate(coverageEndDate.getDate() - 1);
    } else if (periodType === 'years') {
      coverageEndDate.setFullYear(coverageEndDate.getFullYear() + (advancePeriods * frequency));
      coverageEndDate.setDate(coverageEndDate.getDate() - 1);
    }

    // Next amortization date is the start of the first period
    const nextAmortizationDate = new Date(coverageStartDate);

    // Create prepaid expense
    const prepaidExpenseQuery = `
      INSERT INTO prepaid_expenses (
        organisation_id,
        recurring_expense_id,
        payment_date,
        paid_from,
        advance_periods,
        period_type,
        amount_per_period,
        total_amount,
        coverage_start_date,
        coverage_end_date,
        remaining_value,
        amortized_value,
        next_amortization_date,
        recurrence_type,
        recurrence_frequency,
        notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const prepaidExpenseResult = await client.query(prepaidExpenseQuery, [
      organisationId,
      recurringExpenseId,
      paymentDate,
      paidFrom,
      advancePeriods,
      periodType,
      amountPerPeriod,
      totalAmount,
      coverageStartDate.toISOString().split('T')[0],
      coverageEndDate.toISOString().split('T')[0],
      totalAmount, // Initially, remaining_value = total_amount
      0, // Initially, amortized_value = 0
      nextAmortizationDate.toISOString().split('T')[0],
      recurringExpense.recurrence_type,
      recurringExpense.recurrence_frequency,
      req.body.notes || null,
      req.user.id
    ]);

    // Deduct from organization balance
    const updateBalanceQuery = `
      UPDATE organisations
      SET ${paidFrom} = ${paidFrom} - $1
      WHERE id = $2
    `;
    await client.query(updateBalanceQuery, [totalAmount, organisationId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Prepaid expense created successfully',
      prepaidExpense: prepaidExpenseResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating prepaid expense:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get all prepaid expenses for organization
 */
const getAllPrepaidExpenses = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    const query = 'SELECT * FROM active_prepaid_expenses WHERE organisation_id = $1 ORDER BY coverage_end_date ASC';
    const result = await pool.query(query, [organisationId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching prepaid expenses:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get single prepaid expense by ID
 */
const getPrepaidExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const organisationId = req.user.organisationId;

    const query = 'SELECT * FROM active_prepaid_expenses WHERE id = $1 AND organisation_id = $2';
    const result = await pool.query(query, [id, organisationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prepaid expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching prepaid expense:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Run period-based amortization for all active prepaid expenses
 * This should be called daily (via cron job or manually)
 * Amortizes based on the actual recurrence cycle (weekly/monthly/yearly)
 *
 * @param {string} req.body.simulateDate - Optional date to simulate (YYYY-MM-DD format)
 */
const runDailyAmortization = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Allow simulating a specific date for testing
    const today = req.body.simulateDate || new Date().toISOString().split('T')[0];

    // Get all prepaid expenses where next_amortization_date is today or earlier
    const prepaidExpensesQuery = `
      SELECT * FROM prepaid_expenses
      WHERE next_amortization_date <= $1
        AND coverage_end_date >= $1
        AND remaining_value > 0
    `;
    const prepaidExpensesResult = await client.query(prepaidExpensesQuery, [today]);

    let amortizedCount = 0;
    let totalAmortizedAmount = 0;
    const details = [];

    for (const prepaidExpense of prepaidExpensesResult.rows) {
      // Calculate which period we're amortizing
      const amortizedSoFar = parseFloat(prepaidExpense.amortized_value);
      const amountPerPeriod = parseFloat(prepaidExpense.amount_per_period);
      const periodsAmortized = Math.floor(amortizedSoFar / amountPerPeriod);
      const currentPeriodNumber = periodsAmortized + 1;

      // Calculate period dates
      const periodStartDate = new Date(prepaidExpense.next_amortization_date);
      const periodEndDate = new Date(periodStartDate);

      const frequency = parseInt(prepaidExpense.recurrence_frequency);

      if (prepaidExpense.recurrence_type === 'weekly') {
        periodEndDate.setDate(periodEndDate.getDate() + (frequency * 7) - 1);
      } else if (prepaidExpense.recurrence_type === 'monthly') {
        periodEndDate.setMonth(periodEndDate.getMonth() + frequency);
        periodEndDate.setDate(periodEndDate.getDate() - 1);
      } else if (prepaidExpense.recurrence_type === 'yearly') {
        periodEndDate.setFullYear(periodEndDate.getFullYear() + frequency);
        periodEndDate.setDate(periodEndDate.getDate() - 1);
      }

      // Create amortization entry
      const amortizationQuery = `
        INSERT INTO prepaid_expense_amortizations (
          organisation_id,
          prepaid_expense_id,
          amortization_date,
          amount,
          period_number,
          period_start_date,
          period_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      await client.query(amortizationQuery, [
        prepaidExpense.organisation_id,
        prepaidExpense.id,
        today,
        amountPerPeriod,
        currentPeriodNumber,
        periodStartDate.toISOString().split('T')[0],
        periodEndDate.toISOString().split('T')[0]
      ]);

      // Calculate next amortization date
      const nextAmortDate = new Date(periodEndDate);
      nextAmortDate.setDate(nextAmortDate.getDate() + 1); // Day after this period ends

      // Update prepaid expense
      const newRemainingValue = parseFloat(prepaidExpense.remaining_value) - amountPerPeriod;
      const newAmortizedValue = parseFloat(prepaidExpense.amortized_value) + amountPerPeriod;

      const updateQuery = `
        UPDATE prepaid_expenses
        SET
          amortized_value = $1,
          remaining_value = $2,
          next_amortization_date = $3
        WHERE id = $4
      `;
      await client.query(updateQuery, [
        newAmortizedValue,
        Math.max(0, newRemainingValue), // Don't go negative
        nextAmortDate.toISOString().split('T')[0],
        prepaidExpense.id
      ]);

      amortizedCount++;
      totalAmortizedAmount += amountPerPeriod;

      details.push({
        id: prepaidExpense.id,
        period: currentPeriodNumber,
        amount: amountPerPeriod,
        periodStart: periodStartDate.toISOString().split('T')[0],
        periodEnd: periodEndDate.toISOString().split('T')[0],
        nextAmortization: nextAmortDate.toISOString().split('T')[0],
        remainingValue: Math.max(0, newRemainingValue)
      });
    }

    await client.query('COMMIT');

    res.json({
      message: 'Period-based amortization completed successfully',
      amortizedCount,
      totalAmortizedAmount: totalAmortizedAmount.toFixed(2),
      date: today,
      details
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error running amortization:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get total prepaid expenses value (for balance sheet)
 */
const getTotalPrepaidExpensesValue = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    const query = `
      SELECT COALESCE(SUM(remaining_value), 0) as total_prepaid_value
      FROM prepaid_expenses
      WHERE organisation_id = $1
        AND coverage_end_date >= CURRENT_DATE
        AND remaining_value > 0
    `;
    const result = await pool.query(query, [organisationId]);

    res.json({
      totalPrepaidValue: parseFloat(result.rows[0].total_prepaid_value || 0)
    });
  } catch (error) {
    console.error('Error calculating total prepaid value:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createPrepaidExpense,
  getAllPrepaidExpenses,
  getPrepaidExpenseById,
  runDailyAmortization,
  getTotalPrepaidExpensesValue
};
