require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const recreateTables = async () => {
  try {
    console.log('⚠️  WARNING: This will drop existing credit_collection_history and distributor_payment_history tables!');
    console.log('Recreating tables with correct UUID types...\n');

    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, '../config/recreate_history_tables.sql'),
      'utf8'
    );

    // Execute the SQL
    await pool.query(sql);

    console.log('✓ Tables recreated successfully!');
    console.log('✓ credit_collection_history now uses UUID types');
    console.log('✓ distributor_payment_history now uses UUID types');
    console.log('✓ All old data has been cleared\n');

    // Verify
    const check = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'credit_collection_history'
      AND column_name IN ('id', 'sale_id')
      ORDER BY column_name;
    `);

    console.log('Verification:');
    check.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to recreate tables:', error.message);
    console.error(error);
    process.exit(1);
  }
};

recreateTables();
