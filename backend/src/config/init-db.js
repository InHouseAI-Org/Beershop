require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  // First connect to postgres database to create our database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || '',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'beershop';
    const checkDb = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkDb.rows.length === 0) {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database '${dbName}' created successfully`);
    } else {
      console.log(`Database '${dbName}' already exists`);
    }

    await client.end();

    // Now connect to our database and run schema
    const appClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || process.env.USER,
      password: process.env.DB_PASSWORD || '',
      database: dbName
    });

    await appClient.connect();
    console.log('Connected to beershop database');

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await appClient.query(schema);
    console.log('Database schema created successfully');

    // Insert default super admin
    const hashedPassword = bcrypt.hashSync('admin', 10);
    await appClient.query(
      `INSERT INTO super_admins (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hashedPassword, 'superadmin']
    );
    console.log('Default super admin created (username: admin, password: admin)');

    await appClient.end();
    console.log('\nDatabase initialization completed successfully!');
    console.log('You can now start the server with: npm run dev');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
