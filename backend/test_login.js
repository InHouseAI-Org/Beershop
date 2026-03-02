require('dotenv').config();
const axios = require('axios');
const db = require('./src/models/data');

const BASE_URL = 'http://localhost:5001/api';

async function testLogin() {
  try {
    console.log('=== Testing Login with Organisation Name ===\n');

    // Get an admin user
    const orgs = await db.getAllOrganisations();
    if (orgs.length === 0) {
      console.log('❌ No organisations found');
      process.exit(1);
    }

    const org = orgs[0];
    console.log('Organisation:', {
      id: org.id,
      organisation_name: org.organisation_name
    });

    // Simulate what the login endpoint should return
    const organisation = await db.getOrganisationById(org.id);
    console.log('\nOrganisation from DB:', organisation);

    console.log('\n✅ The login endpoint should now return organisationName as:', organisation?.organisation_name);

    if (!organisation?.organisation_name) {
      console.log('\n⚠️  WARNING: Organisation name is empty in database!');
    }

    console.log('\n📝 To test:');
    console.log('1. Make sure backend is restarted');
    console.log('2. Logout from the frontend');
    console.log('3. Login again');
    console.log('4. Check browser console for the login response');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testLogin();
