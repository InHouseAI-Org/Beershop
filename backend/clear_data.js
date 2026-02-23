require('dotenv').config();
const pool = require('./src/config/database');

async function clearOrdersAndSales() {
  const client = await pool.connect();

  try {
    console.log('Starting deletion of orders and sales...\n');

    await client.query('BEGIN');

    // Delete all orders
    const ordersResult = await client.query('DELETE FROM orders');
    console.log(`✅ Deleted ${ordersResult.rowCount} entries from orders table`);

    // Delete all sales
    const salesResult = await client.query('DELETE FROM sales');
    console.log(`✅ Deleted ${salesResult.rowCount} entries from sales table`);

    await client.query('COMMIT');

    // Verify counts
    const ordersCount = await client.query('SELECT COUNT(*) FROM orders');
    const salesCount = await client.query('SELECT COUNT(*) FROM sales');

    console.log('\n📊 Final counts:');
    console.log(`   Orders: ${ordersCount.rows[0].count}`);
    console.log(`   Sales: ${salesCount.rows[0].count}`);
    console.log('\n✅ All data cleared successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearOrdersAndSales()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
