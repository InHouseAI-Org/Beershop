require('dotenv').config();
const pool = require('../database');

async function verifyAlertQtyColumn() {
  const client = await pool.connect();

  try {
    console.log('Verifying alert_qty column...\n');

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'alert_qty';
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✓ alert_qty column exists!');
      console.log('  Column details:', columnCheck.rows[0]);
    } else {
      console.log('✗ alert_qty column NOT found!');
    }

    // Check sample products
    const products = await client.query(`
      SELECT id, product_name, alert_qty
      FROM products
      LIMIT 5;
    `);

    console.log('\nSample products with alert_qty:');
    products.rows.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.product_name}: alert_qty = ${p.alert_qty}`);
    });

  } catch (error) {
    console.error('Error verifying:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAlertQtyColumn();
