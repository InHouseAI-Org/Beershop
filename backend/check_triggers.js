const pool = require('./src/config/database');

async function checkTriggers() {
  try {
    // Check if the trigger function exists
    console.log('=== Checking for trigger function ===');
    const functionCheck = await pool.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'update_distributor_outstanding'
    `);

    if (functionCheck.rows.length > 0) {
      console.log('✓ Trigger function exists');
      console.log('Function body:', functionCheck.rows[0].prosrc.substring(0, 200) + '...');
    } else {
      console.log('✗ Trigger function NOT FOUND');
    }

    // Check if the triggers exist
    console.log('\n=== Checking for triggers ===');
    const triggerCheck = await pool.query(`
      SELECT tgname, tgrelid::regclass AS table_name, tgtype
      FROM pg_trigger
      WHERE tgname LIKE '%outstanding%'
    `);

    if (triggerCheck.rows.length > 0) {
      console.log('✓ Triggers found:');
      triggerCheck.rows.forEach(row => {
        console.log(`  - ${row.tgname} on table ${row.table_name}`);
      });
    } else {
      console.log('✗ No triggers found');
    }

    // Check a sample distributor
    console.log('\n=== Checking distributor outstanding calculation ===');
    const distributors = await pool.query(`
      SELECT d.id, d.name, d.amount_outstanding
      FROM distributors d
      LIMIT 1
    `);

    if (distributors.rows.length > 0) {
      const dist = distributors.rows[0];
      console.log(`\nDistributor: ${dist.name}`);
      console.log(`Current outstanding: ${dist.amount_outstanding}`);

      // Calculate what it should be
      const orderTotal = await pool.query(`
        SELECT COALESCE(SUM(
          (
            SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
            FROM jsonb_array_elements(o.order_data) as item
          ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
        ), 0) as total
        FROM orders o
        WHERE o.distributor_id = $1
      `, [dist.id]);

      const paymentTotal = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM distributor_payments
        WHERE distributor_id = $1
      `, [dist.id]);

      const calculatedOutstanding = parseFloat(orderTotal.rows[0].total) - parseFloat(paymentTotal.rows[0].total);

      console.log(`Total from orders: ${orderTotal.rows[0].total}`);
      console.log(`Total payments: ${paymentTotal.rows[0].total}`);
      console.log(`Calculated outstanding: ${calculatedOutstanding}`);

      if (Math.abs(dist.amount_outstanding - calculatedOutstanding) < 0.01) {
        console.log('✓ Outstanding amount is correct');
      } else {
        console.log('✗ Outstanding amount is INCORRECT');
        console.log(`  Expected: ${calculatedOutstanding}`);
        console.log(`  Actual: ${dist.amount_outstanding}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTriggers();
