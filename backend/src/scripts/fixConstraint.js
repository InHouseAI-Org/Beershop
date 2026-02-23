require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const fixConstraint = async () => {
  try {
    console.log('Fixing collected_by foreign key constraint...');

    // Read the fix SQL file
    const fixSQL = fs.readFileSync(
      path.join(__dirname, '../config/fix_collected_by_constraint.sql'),
      'utf8'
    );

    // Execute the fix
    await pool.query(fixSQL);

    console.log('✓ Foreign key constraints fixed successfully!');
    console.log('✓ collected_by can now accept both admin and user IDs');
    console.log('✓ paid_by can now accept both admin and user IDs');

    process.exit(0);
  } catch (error) {
    console.error('✗ Fix failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

fixConstraint();
