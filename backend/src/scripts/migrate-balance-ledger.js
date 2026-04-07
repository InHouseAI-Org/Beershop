require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  console.log('==========================================');
  console.log('Balance Ledger System Migration');
  console.log('==========================================\n');

  const client = await pool.connect();

  try {
    console.log('✓ Connected to database\n');
    console.log('This migration will:');
    console.log('  1. Create balance_transactions table');
    console.log('  2. Create balance_ledger view');
    console.log('  3. Import historical data from:');
    console.log('     - sales (cash and UPI allocations)');
    console.log('     - expenses');
    console.log('     - balance_transfers');
    console.log('     - miscellaneous_income\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../../create_balance_ledger_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...\n');

    // Execute the migration
    await client.query(sql);

    // Count imported records
    const countResult = await client.query(`
      SELECT
        transaction_type,
        account,
        COUNT(*) as count
      FROM balance_transactions
      GROUP BY transaction_type, account
      ORDER BY transaction_type, account
    `);

    console.log('==========================================');
    console.log('✅ Migration completed successfully!');
    console.log('==========================================\n');

    console.log('Imported transactions:');
    console.table(countResult.rows);

    const totalResult = await client.query('SELECT COUNT(*) as total FROM balance_transactions');
    console.log(`\nTotal transactions: ${totalResult.rows[0].total}\n`);

    console.log('The balance ledger system is now active.');
    console.log('You can now use:');
    console.log('  - GET /api/balance-ledger/cash/ledger');
    console.log('  - GET /api/balance-ledger/bank/ledger');
    console.log('  - GET /api/balance-ledger/gala/ledger\n');

  } catch (error) {
    console.error('\n==========================================');
    console.error('❌ Migration failed!');
    console.error('==========================================\n');
    console.error('Error:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
