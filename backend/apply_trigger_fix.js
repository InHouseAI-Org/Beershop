require('dotenv').config();
const { Pool } = require('pg');

// Create pool with explicit config from .env
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyFix() {
  const client = await pool.connect();

  try {
    console.log('🔗 Connected to database:', process.env.DB_NAME);
    console.log('\n📝 Applying distributor outstanding trigger fix...\n');

    // Drop existing triggers if they exist
    console.log('1️⃣  Dropping existing triggers...');
    await client.query('DROP TRIGGER IF EXISTS trigger_update_outstanding_on_payment ON distributor_payments');
    await client.query('DROP TRIGGER IF EXISTS trigger_update_outstanding_on_order ON orders');
    console.log('   ✓ Triggers dropped');

    // Create or replace the function with proper error handling
    console.log('\n2️⃣  Creating trigger function with opening balance...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_distributor_outstanding()
      RETURNS TRIGGER AS $$
      DECLARE
        target_distributor_id UUID;
      BEGIN
        -- Get the distributor_id from either NEW or OLD record
        target_distributor_id := COALESCE(NEW.distributor_id, OLD.distributor_id);

        IF target_distributor_id IS NULL THEN
          RAISE WARNING 'update_distributor_outstanding: No distributor_id found';
          RETURN COALESCE(NEW, OLD);
        END IF;

        -- Recalculate total outstanding for the distributor
        UPDATE distributors
        SET amount_outstanding = (
          -- Opening balance (initial debt from previous system or starting balance)
          SELECT COALESCE(d.opening_balance, 0)
          FROM distributors d
          WHERE d.id = target_distributor_id
        ) + (
          -- Total from orders (debits)
          SELECT COALESCE(SUM(
            (
              SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
              FROM jsonb_array_elements(o.order_data) as item
            ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
          ), 0)
          FROM orders o
          WHERE o.distributor_id = target_distributor_id
        ) - (
          -- Total payments (credits)
          SELECT COALESCE(SUM(amount), 0)
          FROM distributor_payments dp
          WHERE dp.distributor_id = target_distributor_id
        )
        WHERE id = target_distributor_id;

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✓ Trigger function created');

    // Create triggers
    console.log('\n3️⃣  Creating triggers...');
    await client.query(`
      CREATE TRIGGER trigger_update_outstanding_on_payment
      AFTER INSERT OR UPDATE OR DELETE ON distributor_payments
      FOR EACH ROW
      EXECUTE FUNCTION update_distributor_outstanding()
    `);
    await client.query(`
      CREATE TRIGGER trigger_update_outstanding_on_order
      AFTER INSERT OR UPDATE OR DELETE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_distributor_outstanding()
    `);
    console.log('   ✓ Triggers created');

    // Force recalculation for all distributors
    console.log('\n4️⃣  Recalculating outstanding amounts for all distributors...');
    const distributors = await client.query('SELECT id, name, opening_balance FROM distributors');

    for (const dist of distributors.rows) {
      const openingBalance = parseFloat(dist.opening_balance || 0);

      const result = await client.query(`
        SELECT
          $2::DECIMAL +
          COALESCE((
            SELECT SUM(
              (
                SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
                FROM jsonb_array_elements(o.order_data) as item
              ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
            )
            FROM orders o
            WHERE o.distributor_id = $1
          ), 0) -
          COALESCE((
            SELECT SUM(amount)
            FROM distributor_payments dp
            WHERE dp.distributor_id = $1
          ), 0) as calculated_outstanding
      `, [dist.id, openingBalance]);

      const calculatedOutstanding = result.rows[0].calculated_outstanding;

      await client.query(
        'UPDATE distributors SET amount_outstanding = $1 WHERE id = $2',
        [calculatedOutstanding, dist.id]
      );

      console.log(`   ✓ ${dist.name}: ${calculatedOutstanding}`);
    }

    // Verification
    console.log('\n5️⃣  Verification - Current outstanding amounts:');
    const verification = await client.query(`
      SELECT
        d.name,
        d.opening_balance,
        d.amount_outstanding as current_outstanding,
        (
          SELECT COALESCE(SUM(
            (
              SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
              FROM jsonb_array_elements(o.order_data) as item
            ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
          ), 0)
          FROM orders o
          WHERE o.distributor_id = d.id
        ) as total_orders,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM distributor_payments dp
          WHERE dp.distributor_id = d.id
        ) as total_payments
      FROM distributors d
      ORDER BY d.name
    `);

    console.log('\n   Formula: Outstanding = Opening Balance + Total Orders - Total Payments\n');
    verification.rows.forEach(row => {
      const calculated = parseFloat(row.opening_balance || 0) + parseFloat(row.total_orders) - parseFloat(row.total_payments);
      const matches = Math.abs(parseFloat(row.current_outstanding) - calculated) < 0.01;
      const icon = matches ? '✅' : '❌';
      console.log(`   ${icon} ${row.name}:`);
      console.log(`      Opening: ₹${parseFloat(row.opening_balance || 0).toFixed(2)}`);
      console.log(`      Orders:  ₹${parseFloat(row.total_orders).toFixed(2)}`);
      console.log(`      Payments: ₹${parseFloat(row.total_payments).toFixed(2)}`);
      console.log(`      Current: ₹${parseFloat(row.current_outstanding).toFixed(2)}`);
      console.log(`      Expected: ₹${calculated.toFixed(2)}`);
      console.log('');
    });

    console.log('\n✅ Fix applied successfully!\n');
    console.log('The trigger will now automatically update distributor outstanding amounts when:');
    console.log('  - New orders are created');
    console.log('  - Orders are updated or deleted');
    console.log('  - Payments are made to distributors');
    console.log('  - Payments are updated or deleted');
    console.log('\nFormula: Outstanding = Opening Balance + Total Orders - Total Payments\n');

  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyFix();
