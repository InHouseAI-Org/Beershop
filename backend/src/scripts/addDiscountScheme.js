require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addDiscountScheme() {
  const client = await pool.connect();

  try {
    console.log('Adding discount and scheme columns to orders table...');

    const sql = fs.readFileSync(
      path.join(__dirname, '../config/migrations/add_discount_scheme_to_orders.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✅ Successfully added discount and scheme columns!');

  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDiscountScheme()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
