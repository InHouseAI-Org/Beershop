require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
  try {
    console.log('Starting migration...');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../config/add_history_tables.sql'),
      'utf8'
    );

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✓ Migration completed successfully!');
    console.log('✓ Created credit_collection_history table');
    console.log('✓ Created distributor_payment_history table');
    console.log('✓ Added average_buy_price column to products table');

    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

runMigration();
