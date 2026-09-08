const { Pool } = require('pg');

const useSsl = process.env.DB_SSL == 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? {rejectUnauthorized: false } : false
});

module.exports = pool;