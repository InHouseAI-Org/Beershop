const pool = require('../config/database');

/**
 * Get balance sheet data for organization
 */
const getBalanceSheet = async (req, res) => {
  const client = await pool.connect();
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Get organization balances (cash, bank, gala)
    const balancesQuery = `
      SELECT cash_balance, bank_balance, gala_balance
      FROM organisations
      WHERE id = $1
    `;
    const balancesResult = await client.query(balancesQuery, [organisationId]);
    const balances = balancesResult.rows[0] || { cash_balance: 0, bank_balance: 0, gala_balance: 0 };

    // Get inventory value (sum of all inventory items: qty * buy_price)
    // Use buy_price if available, otherwise fall back to average_buy_price
    const inventoryQuery = `
      SELECT COALESCE(SUM(i.qty * COALESCE(p.buy_price, p.average_buy_price, 0)), 0) as inventory_value
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.organisation_id = $1
    `;
    const inventoryResult = await client.query(inventoryQuery, [organisationId]);
    const inventoryValue = parseFloat(inventoryResult.rows[0].inventory_value || 0);

    // Get scheme to be availed (sum of all active schemes)
    const schemesQuery = `
      SELECT COALESCE(SUM(scheme_value), 0) as schemes_to_be_availed
      FROM schemes
      WHERE organisation_id = $1
        AND status = 'active'
    `;
    const schemesResult = await client.query(schemesQuery, [organisationId]);
    const schemesToBeAvailed = parseFloat(schemesResult.rows[0].schemes_to_be_availed || 0);

    // Get credit to be collected (sum of credit holders' payable amount)
    const creditQuery = `
      SELECT COALESCE(SUM(amount_payable), 0) as credit_to_collect
      FROM credit_holders
      WHERE organisation_id = $1
    `;
    const creditResult = await client.query(creditQuery, [organisationId]);
    const creditToCollect = parseFloat(creditResult.rows[0].credit_to_collect || 0);

    // Get prepaid expenses value (current asset - amount paid in advance)
    const prepaidExpensesQuery = `
      SELECT COALESCE(SUM(remaining_value), 0) as prepaid_expenses_value
      FROM prepaid_expenses
      WHERE organisation_id = $1
        AND coverage_end_date >= CURRENT_DATE
        AND remaining_value > 0
    `;
    const prepaidExpensesResult = await client.query(prepaidExpensesQuery, [organisationId]);
    const prepaidExpensesValue = parseFloat(prepaidExpensesResult.rows[0].prepaid_expenses_value || 0);

    // Get amount payable to distributors (sum of distributor outstanding)
    const distributorsQuery = `
      SELECT COALESCE(SUM(amount_outstanding), 0) as amount_payable
      FROM distributors
      WHERE organisation_id = $1
    `;
    const distributorsResult = await client.query(distributorsQuery, [organisationId]);
    const amountPayable = parseFloat(distributorsResult.rows[0].amount_payable || 0);

    // Get recurring expenses for current month
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const monthlyRecurringQuery = `
      SELECT COALESCE(SUM(re.expense_amount), 0) as monthly_recurring
      FROM recurring_expenses re
      WHERE re.organisation_id = $1
        AND re.is_active = true
        AND re.next_due_date >= $2
        AND re.next_due_date <= $3
    `;
    const monthlyRecurringResult = await client.query(monthlyRecurringQuery, [
      organisationId,
      monthStart.toISOString().split('T')[0],
      monthEnd.toISOString().split('T')[0]
    ]);
    const monthlyRecurring = parseFloat(monthlyRecurringResult.rows[0].monthly_recurring || 0);

    // Get recurring expenses for REMAINING financial year (TODAY to March 31st)
    // Financial year in India: April 1st to March 31st
    const today = new Date();

    // Calculate the end of current financial year (March 31st)
    const fyEnd = new Date(
      today.getMonth() >= 3 ? today.getFullYear() + 1 : today.getFullYear(),
      2, // March (0-indexed)
      31
    );

    // Calculate remaining days in financial year
    const remainingDays = Math.ceil((fyEnd - today) / (1000 * 60 * 60 * 24));
    const remainingWeeks = remainingDays / 7;
    const remainingMonths = remainingDays / 30.44; // Average days per month

    // Calculate recurring expenses for REMAINING financial year
    const yearlyRecurringQuery = `
      SELECT
        re.expense_amount,
        re.recurrence_type,
        re.recurrence_frequency,
        re.next_due_date
      FROM recurring_expenses re
      WHERE re.organisation_id = $1
        AND re.is_active = true
    `;
    const yearlyRecurringResult = await client.query(yearlyRecurringQuery, [organisationId]);

    let yearlyRecurring = 0;
    yearlyRecurringResult.rows.forEach(expense => {
      const amount = parseFloat(expense.expense_amount);
      const frequency = parseInt(expense.recurrence_frequency);
      const nextDueDate = expense.next_due_date ? new Date(expense.next_due_date) : null;
      let occurrencesInRemainingPeriod = 0;

      // Skip if next_due_date is after FY end (expense is for next FY)
      if (nextDueDate && nextDueDate > fyEnd) {
        return; // Skip this expense
      }

      // Skip if next_due_date is null (no due date set)
      if (!nextDueDate) {
        return; // Skip this expense
      }

      // Calculate remaining period from next_due_date to FY end
      const remainingDaysFromDue = Math.max(0, Math.ceil((fyEnd - nextDueDate) / (1000 * 60 * 60 * 24)));
      const remainingWeeksFromDue = remainingDaysFromDue / 7;
      const remainingMonthsFromDue = remainingDaysFromDue / 30.44;

      // Only calculate if next_due_date is today or before FY end
      if (nextDueDate <= fyEnd) {
        switch (expense.recurrence_type) {
          case 'weekly':
            // How many times will this expense occur from next_due_date to FY end?
            // First occurrence is the next_due_date itself, then calculate additional occurrences
            occurrencesInRemainingPeriod = 1 + Math.floor(remainingWeeksFromDue / frequency);
            break;
          case 'monthly':
            // How many times will this expense occur from next_due_date to FY end?
            occurrencesInRemainingPeriod = 1 + Math.floor(remainingMonthsFromDue / frequency);
            break;
          case 'yearly':
            // Will this yearly expense occur again in the remaining period?
            // First occurrence is the next_due_date, check if there's another occurrence
            occurrencesInRemainingPeriod = 1 + (remainingMonthsFromDue >= (frequency * 12) ? 1 : 0);
            break;
        }
      }

      yearlyRecurring += amount * occurrencesInRemainingPeriod;
    });

    // Calculate totals
    const totalAssets =
      inventoryValue +
      schemesToBeAvailed +
      parseFloat(balances.bank_balance || 0) +
      parseFloat(balances.cash_balance || 0) +
      parseFloat(balances.gala_balance || 0) +
      creditToCollect +
      prepaidExpensesValue;

    const totalLiabilities =
      amountPayable +
      monthlyRecurring +
      yearlyRecurring;

    const netWorth = totalAssets - totalLiabilities;

    res.json({
      assets: {
        inventoryValue,
        schemesToBeAvailed,
        bankBalance: parseFloat(balances.bank_balance || 0),
        cashBalance: parseFloat(balances.cash_balance || 0),
        galaBalance: parseFloat(balances.gala_balance || 0),
        creditToCollect,
        prepaidExpenses: prepaidExpensesValue,
        total: totalAssets
      },
      liabilities: {
        amountPayable,
        monthlyRecurring,
        yearlyRecurring,
        total: totalLiabilities
      },
      netWorth,
      asOfDate: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error fetching balance sheet:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getBalanceSheet
};
