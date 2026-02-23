require('dotenv').config();
const pool = require('../config/database');

async function clearData() {
  const client = await pool.connect();

  try {
    console.log('Starting data deletion...');
    await client.query('BEGIN');

    // Delete child tables first
    console.log('Deleting credit_collection_history...');
    await client.query('DELETE FROM credit_collection_history');

    console.log('Deleting distributor_payment_history...');
    await client.query('DELETE FROM distributor_payment_history');

    console.log('Deleting sales...');
    await client.query('DELETE FROM sales');

    console.log('Deleting orders...');
    await client.query('DELETE FROM orders');

    console.log('Deleting inventory...');
    await client.query('DELETE FROM inventory');

    // Delete entity tables
    console.log('Deleting credit_holders...');
    await client.query('DELETE FROM credit_holders');

    console.log('Deleting distributors...');
    await client.query('DELETE FROM distributors');

    console.log('Deleting products...');
    await client.query('DELETE FROM products');

    // Delete organisations
    console.log('Deleting organisations...');
    await client.query('DELETE FROM organisations');

    await client.query('COMMIT');
    console.log('\n✅ All data deleted successfully!');

    // Verify deletions
    console.log('\n=== Verification ===');
    const result = await client.query(`
      SELECT 'credit_collection_history' as table_name, COUNT(*) as remaining_rows FROM credit_collection_history
      UNION ALL
      SELECT 'distributor_payment_history', COUNT(*) FROM distributor_payment_history
      UNION ALL
      SELECT 'sales', COUNT(*) FROM sales
      UNION ALL
      SELECT 'orders', COUNT(*) FROM orders
      UNION ALL
      SELECT 'inventory', COUNT(*) FROM inventory
      UNION ALL
      SELECT 'credit_holders', COUNT(*) FROM credit_holders
      UNION ALL
      SELECT 'distributors', COUNT(*) FROM distributors
      UNION ALL
      SELECT 'products', COUNT(*) FROM products
      UNION ALL
      SELECT 'organisations', COUNT(*) FROM organisations
      UNION ALL
      SELECT 'users (kept)', COUNT(*) FROM users
      UNION ALL
      SELECT 'admins (kept)', COUNT(*) FROM admins
      UNION ALL
      SELECT 'super_admins (kept)', COUNT(*) FROM super_admins
      ORDER BY table_name
    `);

    console.table(result.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
