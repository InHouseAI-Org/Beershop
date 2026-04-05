const { Pool } = require('pg');

// Support both individual env vars and DATABASE_URL
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL + '?sslmode=verify-full',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Optimized connection pool settings for Neon + Vercel serverless
      max: 10, // Maximum number of clients in the pool (Neon free tier: 20 connections max)
      min: 0, // Minimum number of clients (serverless: start with 0)
      idleTimeoutMillis: 10000, // Close idle clients after 10 seconds (serverless: don't keep connections)
      connectionTimeoutMillis: 5000, // Timeout if connection takes > 5 seconds
      query_timeout: 10000, // Cancel queries that run longer than 10 seconds
      statement_timeout: 10000, // Postgres statement timeout
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
      statement_timeout: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
