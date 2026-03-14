require('dotenv').config();
const pool = require('./src/config/database');

async function verify() {
  const client = await pool.connect();

  try {
    // Check if schemes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'schemes'
      );
    `);

    console.log('✓ Schemes table exists:', tableCheck.rows[0].exists);

    // Check if view exists
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_name = 'scheme_tracking'
      );
    `);

    console.log('✓ Scheme tracking view exists:', viewCheck.rows[0].exists);

    // Check table structure
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'schemes'
      ORDER BY ordinal_position;
    `);

    console.log('\n✓ Schemes table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

verify();
