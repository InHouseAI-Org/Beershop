require('dotenv').config();
const pool = require('../config/database');

const testCreditHistory = async () => {
  try {
    console.log('=== Testing Credit Collection History Table ===\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'credit_collection_history'
      );
    `);
    console.log('1. Table exists:', tableCheck.rows[0].exists);

    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'credit_collection_history'
      ORDER BY ordinal_position;
    `);
    console.log('\n2. Table structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check existing records
    const records = await pool.query(`
      SELECT COUNT(*) as count FROM credit_collection_history;
    `);
    console.log('\n3. Total records in table:', records.rows[0].count);

    // Show recent records
    const recent = await pool.query(`
      SELECT
        id,
        credit_holder_id,
        amount_collected,
        transaction_type,
        sale_id,
        collected_at
      FROM credit_collection_history
      ORDER BY collected_at DESC
      LIMIT 5;
    `);
    console.log('\n4. Recent records:');
    if (recent.rows.length === 0) {
      console.log('   No records found');
    } else {
      recent.rows.forEach(r => {
        console.log(`   - ${r.transaction_type}: ₹${r.amount_collected} (${r.collected_at})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testCreditHistory();
