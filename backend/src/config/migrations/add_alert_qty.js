require('dotenv').config();
const pool = require('../database');

async function addAlertQtyColumn() {
  const client = await pool.connect();

  try {
    console.log('Starting migration: Adding alert_qty column to products table...');

    // Add alert_qty column if it doesn't exist
    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS alert_qty DECIMAL(10, 2) DEFAULT 0;
    `);

    console.log('✓ Successfully added alert_qty column to products table');

    // Add comment to the column (optional, may fail if not supported)
    try {
      await client.query(`
        COMMENT ON COLUMN products.alert_qty IS 'Minimum quantity threshold - alert when inventory goes below this value';
      `);
      console.log('✓ Successfully added column comment');
    } catch (commentErr) {
      console.log('Note: Column comment not added (this is optional)');
    }

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAlertQtyColumn()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
