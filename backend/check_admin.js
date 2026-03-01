require('dotenv').config();
const pool = require('./src/config/database');

(async () => {
  try {
    console.log('Checking for admin "jjj"...');

    const result = await pool.query(
      "SELECT id, username, organisation_id FROM admins WHERE TRIM(username) = $1",
      ['jjj']
    );

    if (result.rows.length > 0) {
      console.log('\n✓ Admin found:');
      console.log('  Username:', result.rows[0].username);
      console.log('  ID:', result.rows[0].id);
      console.log('  Organisation ID:', result.rows[0].organisation_id);
      console.log('\nNote: Passwords are hashed and cannot be retrieved.');
      console.log('If you need to reset the password, I can help you do that.');
    } else {
      console.log('\n✗ No admin found with username "jjj"');
      console.log('\nAvailable admins:');
      const allAdmins = await pool.query('SELECT username FROM admins');
      allAdmins.rows.forEach(admin => {
        console.log('  -', admin.username);
      });
    }

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
