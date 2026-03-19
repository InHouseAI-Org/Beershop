const pool = require('./src/config/database');
const fs = require('fs');

async function applyFix() {
  const client = await pool.connect();
  try {
    console.log('Applying payment_type constraint fix...');

    const sql = fs.readFileSync('./fix_payment_type_constraint.sql', 'utf8');
    await client.query(sql);

    console.log('✓ Successfully updated payment_type constraint to include "opening_balance_payment"');
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
