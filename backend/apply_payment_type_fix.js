const pool = require('./src/config/database');
const fs = require('fs');

async function applyFix() {
  const client = await pool.connect();
  try {
    console.log('Applying payment_type column length fix...');

    const sql = fs.readFileSync('./fix_payment_type_length.sql', 'utf8');
    await client.query(sql);

    console.log('✓ Successfully increased payment_type column to VARCHAR(30)');
    console.log('The system can now accept "opening_balance_payment" type.');
  } catch (error) {
    console.error('Error applying fix:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

applyFix();
