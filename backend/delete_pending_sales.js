require('dotenv').config();
const pool = require('./src/config/database');

(async () => {
  try {
    console.log('Connecting to database...');

    // First, check how many sales exist
    const checkResult = await pool.query('SELECT COUNT(*) FROM sales');
    console.log('Total sales found:', checkResult.rows[0].count);

    if (checkResult.rows[0].count > 0) {
      // Delete all daily expenses first (foreign key constraint)
      const expensesResult = await pool.query('DELETE FROM daily_expenses');
      console.log('✓ Deleted', expensesResult.rowCount, 'daily expenses');

      // Delete all sales
      const deleteResult = await pool.query('DELETE FROM sales RETURNING id');
      console.log('✓ Successfully deleted', deleteResult.rowCount, 'sales entries');
    } else {
      console.log('No sales to delete.');
    }

    await pool.end();
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
