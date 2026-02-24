const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    const migrationPath = path.join(__dirname, '..', 'ADD_USERNAME_TO_BALANCE_TRANSFERS.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('Running migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
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
