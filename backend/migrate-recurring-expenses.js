require('dotenv').config();
const fs = require('fs');
const pool = require('./src/config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Connected to database...');

    // Read the SQL file
    const sql = fs.readFileSync('/Users/manavbathija/Desktop/Beershop/create_recurring_expenses.sql', 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('✓ Migration completed successfully!');
    console.log('✓ recurring_expenses table created');
    console.log('✓ recurring_expense_payments table created');
    console.log('✓ recurring_expenses_summary view created');
    console.log('✓ Triggers created');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
