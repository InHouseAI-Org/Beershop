require('dotenv').config();
const pool = require('./src/config/database');

async function verify() {
  const client = await pool.connect();

  try {
    // Check if tables exist
    const tablesCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('recurring_expenses', 'recurring_expense_payments')
      ORDER BY table_name;
    `);

    console.log('✓ Tables found:');
    tablesCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check if view exists
    const viewCheck = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name = 'recurring_expenses_summary';
    `);

    console.log('\n✓ Views found:');
    viewCheck.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check recurring_expenses table structure
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'recurring_expenses'
      ORDER BY ordinal_position;
    `);

    console.log('\n✓ recurring_expenses table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

verify();
