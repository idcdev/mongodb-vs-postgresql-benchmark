const { Pool } = require('pg');
const pgp = require('pg-promise')();
require('dotenv').config();

// PostgreSQL connection string
const PG_URI = process.env.PG_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: PG_URI,
});

// pg-promise connection
const db = pgp(PG_URI);

// Get PostgreSQL client
async function getPgClient() {
  return await pool.connect();
}

// Close PostgreSQL client
async function closePgClient(client) {
  if (client) {
    client.release();
  }
}

// Execute query with pg-promise
async function executeQuery(query, params = []) {
  return await db.query(query, params);
}

// Initialize PostgreSQL database
async function initializeDatabase() {
  try {
    const client = await getPgClient();
    
    // Create tables if they don't exist
    // This will be implemented in the model files
    
    client.release();
    return true;
  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
    return false;
  }
}

module.exports = {
  pool,
  db,
  getPgClient,
  closePgClient,
  executeQuery,
  initializeDatabase,
  PG_URI,
}; 