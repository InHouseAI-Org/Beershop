const pool = require('../database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
  try {
    console.log('Running history tables migration...');

    // Read and run credit collection history migration
    const creditCollectionSql = fs.readFileSync(
      path.join(__dirname, 'create_credit_collection_history.sql'),
      'utf8'
    );
    await pool.query(creditCollectionSql);
    console.log('✓ Credit collection history table created successfully');

    // Read and run distributor payment history migration
    const distributorPaymentSql = fs.readFileSync(
      path.join(__dirname, 'create_distributor_payment_history.sql'),
      'utf8'
    );
    await pool.query(distributorPaymentSql);
    console.log('✓ Distributor payment history table created successfully');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
