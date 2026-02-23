require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432
});

const runMigration = async () => {
  try {
    console.log('Running migration: Allow NULL values for qty in inventory table...');

    await pool.query('ALTER TABLE inventory ALTER COLUMN qty DROP NOT NULL');

    console.log('✅ Migration completed successfully!');
    console.log('The qty column in inventory table now allows NULL values.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
