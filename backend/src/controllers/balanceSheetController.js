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

    // Get inventory value (sum of all inventory items: qty * average_buy_price)
    const inventoryQuery = `
      SELECT COALESCE(SUM(i.qty * p.average_buy_price), 0) as inventory_value
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.organisation_id = $1
    `;
    const inventoryResult = await client.query(inventoryQuery, [organisationId]);
    const inventoryValue = parseFloat(inventoryResult.rows[0].inventory_value || 0);

    // Get scheme to be availed (sum of achieved active schemes)
    const schemesQuery = `
      SELECT COALESCE(SUM(scheme_value), 0) as schemes_to_be_availed
      FROM schemes
      WHERE organisation_id = $1
        AND status = 'active'
        AND achieved = true
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

    // Get recurring expenses for financial year (April - March)
    const fyStart = new Date(
      currentDate.getMonth() >= 3 ? currentDate.getFullYear() : currentDate.getFullYear() - 1,
      3, // April (0-indexed)
      1
    );
    const fyEnd = new Date(
      currentDate.getMonth() >= 3 ? currentDate.getFullYear() + 1 : currentDate.getFullYear(),
      2, // March (0-indexed)
      31
    );

    // Calculate yearly recurring expenses based on frequency and type
    const yearlyRecurringQuery = `
      SELECT
        re.expense_amount,
        re.recurrence_type,
        re.recurrence_frequency
      FROM recurring_expenses re
      WHERE re.organisation_id = $1
        AND re.is_active = true
    `;
    const yearlyRecurringResult = await client.query(yearlyRecurringQuery, [organisationId]);

    let yearlyRecurring = 0;
    yearlyRecurringResult.rows.forEach(expense => {
      const amount = parseFloat(expense.expense_amount);
      let occurrencesPerYear = 0;

      switch (expense.recurrence_type) {
        case 'weekly':
          occurrencesPerYear = 52 / parseInt(expense.recurrence_frequency);
          break;
        case 'monthly':
          occurrencesPerYear = 12 / parseInt(expense.recurrence_frequency);
          break;
        case 'yearly':
          occurrencesPerYear = 1 / parseInt(expense.recurrence_frequency);
          break;
      }

      yearlyRecurring += amount * occurrencesPerYear;
    });

    // Calculate totals
    const totalAssets =
      inventoryValue +
      schemesToBeAvailed +
      parseFloat(balances.bank_balance || 0) +
      parseFloat(balances.cash_balance || 0) +
      parseFloat(balances.gala_balance || 0) +
      creditToCollect;

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
