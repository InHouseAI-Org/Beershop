require('dotenv').config();
const pool = require('./src/config/database');

const expenseCategories = [
  { name: 'Electricity Bill', minAmount: 2000, maxAmount: 5000, from: 'cash_balance' },
  { name: 'Rent', minAmount: 15000, maxAmount: 25000, from: 'bank_balance' },
  { name: 'Staff Salary', minAmount: 8000, maxAmount: 15000, from: 'bank_balance' },
  { name: 'Transportation', minAmount: 500, maxAmount: 2000, from: 'cash_balance' },
  { name: 'Maintenance', minAmount: 1000, maxAmount: 4000, from: 'cash_balance' },
  { name: 'Office Supplies', minAmount: 300, maxAmount: 1500, from: 'cash_balance' },
  { name: 'Internet Bill', minAmount: 1000, maxAmount: 2000, from: 'bank_balance' },
  { name: 'Water Bill', minAmount: 500, maxAmount: 1500, from: 'cash_balance' },
  { name: 'Miscellaneous', minAmount: 200, maxAmount: 1000, from: 'cash_balance' },
  { name: 'Security Services', minAmount: 3000, maxAmount: 6000, from: 'bank_balance' },
  { name: 'Cleaning Services', minAmount: 2000, maxAmount: 4000, from: 'cash_balance' },
  { name: 'Mobile Recharge', minAmount: 300, maxAmount: 800, from: 'cash_balance' },
];

(async () => {
  try {
    console.log('Starting to seed expense data...');

    // Get organisation ID
    const orgResult = await pool.query('SELECT id FROM organisations LIMIT 1');
    if (orgResult.rows.length === 0) {
      console.error('No organisation found!');
      process.exit(1);
    }
    const organisationId = orgResult.rows[0].id;
    console.log('Organisation ID:', organisationId);

    // Get current organisation balances
    const balancesResult = await pool.query(
      'SELECT cash_balance, bank_balance, gala_balance FROM organisations WHERE id = $1',
      [organisationId]
    );
    let balances = {
      cash_balance: parseFloat(balancesResult.rows[0].cash_balance || 0),
      bank_balance: parseFloat(balancesResult.rows[0].bank_balance || 0),
      gala_balance: parseFloat(balancesResult.rows[0].gala_balance || 0),
    };
    console.log('Initial balances:', balances);

    // Generate expenses for the last 5 months
    const months = 5;
    const today = new Date();
    let totalExpenses = 0;

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      const daysInMonth = monthEnd.getDate();

      console.log(`\nGenerating expenses for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}...`);

      // Create 5-8 expenses per month on different days
      const expensesPerMonth = 5 + Math.floor(Math.random() * 4);
      const usedDays = new Set();

      for (let j = 0; j < expensesPerMonth; j++) {
        // Pick a random day in the month
        let day;
        do {
          day = 1 + Math.floor(Math.random() * daysInMonth);
        } while (usedDays.has(day));
        usedDays.add(day);

        const expenseDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
        const dateStr = expenseDate.toISOString().split('T')[0];

        // Pick a random expense category
        const category = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
        const amount = Math.floor(category.minAmount + Math.random() * (category.maxAmount - category.minAmount));

        // Check if we have sufficient balance
        const balanceType = category.from;
        if (balances[balanceType] >= amount) {
          try {
            await pool.query(
              `INSERT INTO expenses (organisation_id, expense_name, description, expense_from, expense_amount, date, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
              [
                organisationId,
                category.name,
                `Monthly ${category.name.toLowerCase()} payment`,
                balanceType,
                amount,
                dateStr
              ]
            );

            // Update local balance tracking
            balances[balanceType] -= amount;
            totalExpenses += amount;

            console.log(`  ✓ ${dateStr}: ${category.name} - ₹${amount} from ${balanceType}`);
          } catch (error) {
            console.error(`  ✗ Error creating expense: ${error.message}`);
          }
        } else {
          console.log(`  ⚠ Skipped ${category.name} - Insufficient ${balanceType} (need ₹${amount}, have ₹${balances[balanceType].toFixed(2)})`);
        }
      }
    }

    // Update organisation balances in database
    await pool.query(
      `UPDATE organisations
       SET cash_balance = $1, bank_balance = $2, gala_balance = $3
       WHERE id = $4`,
      [balances.cash_balance, balances.bank_balance, balances.gala_balance, organisationId]
    );

    console.log('\n✅ Expense data seeding completed!');
    console.log(`Total expenses created: ₹${totalExpenses.toFixed(2)}`);
    console.log('Final balances:', balances);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding expense data:', error);
    await pool.end();
    process.exit(1);
  }
})();
