require('dotenv').config();
const pool = require('./src/config/database');

const TARGET_ORG_ID = '8cfe59cd-7eb5-45ac-b38a-b273f70f3dc2';

(async () => {
  try {
    console.log('Starting data migration...\n');

    // 1. Find admin "jjj" and their organisation
    const adminResult = await pool.query(
      "SELECT id, username, organisation_id FROM admins WHERE TRIM(username) = $1",
      ['jjj']
    );

    if (adminResult.rows.length === 0) {
      console.log('Admin "jjj" not found. Nothing to migrate.');
      await pool.end();
      process.exit(0);
    }

    const jjjAdmin = adminResult.rows[0];
    const sourceOrgId = jjjAdmin.organisation_id;

    console.log('Found admin "jjj":');
    console.log('  Admin ID:', jjjAdmin.id);
    console.log('  Source Organisation ID:', sourceOrgId);
    console.log('  Target Organisation ID:', TARGET_ORG_ID);
    console.log('');

    // 2. Migrate all data from source org to target org
    const tables = [
      'products',
      'distributors',
      'credit_holders',
      'orders',
      'sales',
      'inventory',
      'balances',
      'expenses',
      'daily_expenses',
      'balance_transfers',
      'credit_collection_history',
      'distributor_payment_history'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(
          `UPDATE ${table} SET organisation_id = $1 WHERE organisation_id = $2 RETURNING id`,
          [TARGET_ORG_ID, sourceOrgId]
        );
        console.log(`✓ Migrated ${result.rowCount} records from ${table}`);
      } catch (err) {
        // Table might not exist or have organisation_id column
        console.log(`  Skipped ${table} (${err.message.split('\n')[0]})`);
      }
    }

    // 3. Migrate users to target organisation
    try {
      const usersResult = await pool.query(
        `UPDATE users SET organisation_id = $1 WHERE organisation_id = $2 RETURNING id`,
        [TARGET_ORG_ID, sourceOrgId]
      );
      console.log(`✓ Migrated ${usersResult.rowCount} users`);
    } catch (err) {
      console.log(`  Skipped users (${err.message.split('\n')[0]})`);
    }

    console.log('');

    // 4. Delete admin "jjj"
    await pool.query('DELETE FROM admins WHERE id = $1', [jjjAdmin.id]);
    console.log('✓ Deleted admin "jjj"');

    // 5. Delete old organisation if it exists and is empty
    try {
      await pool.query('DELETE FROM organisations WHERE id = $1', [sourceOrgId]);
      console.log('✓ Deleted old organisation:', sourceOrgId);
    } catch (err) {
      console.log('  Could not delete old organisation (may have dependencies)');
    }

    console.log('\n✅ Migration completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
