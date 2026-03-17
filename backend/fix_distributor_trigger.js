const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function fixTrigger() {
  const client = await pool.connect();

  try {
    console.log('Starting distributor outstanding trigger fix...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'fix_distributor_outstanding_trigger.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute the SQL
    await client.query(sql);

    console.log('\n✓ Trigger fix completed successfully!');
    console.log('\nThe trigger will now automatically update distributor outstanding amounts when:');
    console.log('  - New orders are created');
    console.log('  - Orders are updated or deleted');
    console.log('  - Payments are made to distributors');
    console.log('  - Payments are updated or deleted');

  } catch (error) {
    console.error('Error fixing trigger:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTrigger();
