require('dotenv').config();
const pool = require('./src/config/database');

async function simulateAmortization(simulateDate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const today = simulateDate;
    console.log(`\n🗓️  Simulating amortization for date: ${today}\n`);

    // Get all prepaid expenses where next_amortization_date is today or earlier
    const prepaidExpensesQuery = `
      SELECT * FROM prepaid_expenses
      WHERE next_amortization_date <= $1
        AND coverage_end_date >= $1
        AND remaining_value > 0
    `;
    const prepaidExpensesResult = await client.query(prepaidExpensesQuery, [today]);

    console.log(`📊 Found ${prepaidExpensesResult.rows.length} prepaid expense(s) ready for amortization\n`);

    let amortizedCount = 0;
    let totalAmortizedAmount = 0;
    const details = [];

    for (const prepaidExpense of prepaidExpensesResult.rows) {
      console.log(`\n💰 Processing prepaid expense ID: ${prepaidExpense.id}`);
      console.log(`   Amount per period: ₹${prepaidExpense.amount_per_period}`);
      console.log(`   Current remaining: ₹${prepaidExpense.remaining_value}`);
      console.log(`   Already amortized: ₹${prepaidExpense.amortized_value}`);

      // Calculate which period we're amortizing
      const amortizedSoFar = parseFloat(prepaidExpense.amortized_value);
      const amountPerPeriod = parseFloat(prepaidExpense.amount_per_period);
      const periodsAmortized = Math.floor(amortizedSoFar / amountPerPeriod);
      const currentPeriodNumber = periodsAmortized + 1;

      console.log(`   This is period #${currentPeriodNumber}`);

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

      console.log(`   Period: ${periodStartDate.toISOString().split('T')[0]} to ${periodEndDate.toISOString().split('T')[0]}`);

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

      console.log(`   ✅ Amortized ₹${amountPerPeriod}`);
      console.log(`   📅 Next amortization: ${nextAmortDate.toISOString().split('T')[0]}`);
      console.log(`   💵 New remaining value: ₹${Math.max(0, newRemainingValue).toFixed(2)}`);

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

    console.log(`\n\n✨ Amortization Summary:`);
    console.log(`   Expenses processed: ${amortizedCount}`);
    console.log(`   Total amount amortized: ₹${totalAmortizedAmount.toFixed(2)}`);
    console.log(`   Date: ${today}\n`);

    if (details.length > 0) {
      console.log(`📋 Details:`);
      details.forEach(d => {
        console.log(`   - Period ${d.period}: ₹${d.amount.toFixed(2)} (${d.periodStart} to ${d.periodEnd})`);
        console.log(`     Next: ${d.nextAmortization}, Remaining: ₹${d.remainingValue.toFixed(2)}`);
      });
    }

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error running amortization:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

// Get date from command line argument or use default
const simulateDate = process.argv[2] || '2026-04-03';
simulateAmortization(simulateDate);
