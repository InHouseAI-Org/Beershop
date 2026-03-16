require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running opening_balance migration...');

    const sql = fs.readFileSync(
      path.join(__dirname, 'add_opening_balance_to_distributors.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✓ Migration completed successfully!');
    console.log('✓ Added opening_balance column to distributors table');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
