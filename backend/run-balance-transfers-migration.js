const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'bs_user',
  password: 'bs_password',
  database: 'beershop'
});

async function runMigration() {
  try {
    console.log('Connecting to database...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'ADD_BALANCE_TRANSFERS_TABLE.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    console.log(migrationSQL);

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('The balance_transfers table has been created.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
