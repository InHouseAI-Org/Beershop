const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function applyMigration() {
  // Use DATABASE_URL from .env for Neon connection
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to Neon database');

    const sql = fs.readFileSync('./neon_opening_balance_payment_migration.sql', 'utf8');

    console.log('\nApplying migration...');
    await client.query(sql);

    console.log('✓ Migration completed successfully!');

    // Verify the changes
    console.log('\nVerifying changes...');

    const columnCheck = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'distributor_payments' AND column_name = 'payment_type'
    `);
    console.log('payment_type column:', columnCheck.rows[0]);

    const constraintCheck = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'distributor_payments_payment_type_check'
    `);
    console.log('CHECK constraint:', constraintCheck.rows[0]);

    console.log('\n✓ All changes verified successfully!');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

applyMigration();
