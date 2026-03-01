require('dotenv').config();
const pool = require('./src/config/database');
const crypto = require('crypto');

const uuidv4 = () => crypto.randomUUID();

const expenseTypes = [
  { name: 'Transportation', min: 100, max: 500 },
  { name: 'Daily Supplies', min: 50, max: 300 },
  { name: 'Staff Tea/Snacks', min: 80, max: 200 },
  { name: 'Cleaning Materials', min: 100, max: 400 },
  { name: 'Miscellaneous Daily', min: 50, max: 250 },
  { name: 'Delivery Charges', min: 150, max: 600 },
  { name: 'Petty Cash', min: 100, max: 350 },
  { name: 'Local Vendor Payment', min: 200, max: 800 },
];

(async () => {
  try {
    console.log('Starting to seed daily expenses...');

    // Get all approved sales with their dates
    const salesResult = await pool.query(`
      SELECT id, organisation_id, date
      FROM sales
      WHERE status = 'approved'
      ORDER BY date
    `);

    if (salesResult.rows.length === 0) {
      console.log('No approved sales found!');
      await pool.end();
      process.exit(0);
    }

    console.log(`Found ${salesResult.rows.length} approved sales`);

    let totalExpenses = 0;
    let totalAmount = 0;

    for (const sale of salesResult.rows) {
      // 60% chance to have 1-3 daily expenses for each sale
      if (Math.random() < 0.6) {
        const numExpenses = 1 + Math.floor(Math.random() * 3); // 1-3 expenses

        for (let i = 0; i < numExpenses; i++) {
          const expenseType = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
          const amount = Math.floor(expenseType.min + Math.random() * (expenseType.max - expenseType.min));

          await pool.query(`
            INSERT INTO daily_expenses (id, organisation_id, sale_id, name, description, amount, expense_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          `, [
            uuidv4(),
            sale.organisation_id,
            sale.id,
            expenseType.name,
            `Daily ${expenseType.name.toLowerCase()} on ${sale.date}`,
            amount,
            sale.date
          ]);

          totalExpenses++;
          totalAmount += amount;

          console.log(`  ✓ ${sale.date}: ${expenseType.name} - ₹${amount}`);
        }
      }
    }

    console.log('\n✅ Daily expenses seeding completed!');
    console.log(`Total daily expenses created: ${totalExpenses}`);
    console.log(`Total amount: ₹${totalAmount}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding daily expenses:', error);
    await pool.end();
    process.exit(1);
  }
})();
