const { Pool } = require('pg');
require('dotenv').config();

const PG_CONNECTION = process.env.PG_CONNECTION || 'postgresql://postgres:postgres@localhost:5432/benchmark';

const pool = new Pool({
  connectionString: PG_CONNECTION
});

/**
 * Get PostgreSQL client
 * @returns {Promise<Client>} PostgreSQL client
 */
async function getPgClient() {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    throw error;
  }
}

module.exports = {
  getPgClient,
  pool
}; 