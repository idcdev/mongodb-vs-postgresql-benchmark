/**
 * PostgreSQL operations for the find benchmark
 */

const { Pool } = require('pg');
const pgp = require('pg-promise')();
require('dotenv').config();

// Prefix for tables in this benchmark
const TABLE_PREFIX = 'find_';

// PostgreSQL connection URI
const PG_URI = process.env.PG_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark';

// PostgreSQL connection
const pool = new Pool({ connectionString: PG_URI });
const db = pgp(PG_URI);

// Flag to track if the pool has been closed
let poolClosed = false;

/**
 * Set up PostgreSQL environment for the benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  const client = await pool.connect();
  
  try {
    // Create tables for the benchmark
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        age INTEGER,
        street VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN,
        tags TEXT[],
        metadata JSONB
      )
    `);
    
    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS ${TABLE_PREFIX}users_country_idx ON ${TABLE_PREFIX}users(country)`);
    
    // Insert test data
    const users = require('../data-generator').generateUsers(1000);
    
    // Convert users to PostgreSQL format
    const pgUsers = users.map(user => ({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      age: user.age,
      street: user.address.street,
      city: user.address.city,
      state: user.address.state,
      zip_code: user.address.zipCode,
      country: user.address.country,
      is_active: user.isActive,
      tags: user.tags,
      metadata: user.metadata
    }));
    
    // Insert users using pg-promise
    const cs = new pgp.helpers.ColumnSet([
      'first_name', 'last_name', 'email', 'age',
      'street', 'city', 'state', 'zip_code', 'country',
      'is_active', 'tags', 'metadata'
    ], { table: `${TABLE_PREFIX}users` });
    
    const insertQuery = pgp.helpers.insert(pgUsers, cs);
    await db.none(insertQuery);
    
    console.log('PostgreSQL tables created and populated successfully for find benchmark');
  } catch (error) {
    console.error('Error setting up PostgreSQL for find benchmark:', error);
  } finally {
    await client.release();
  }
}

/**
 * Clean up PostgreSQL environment for the benchmark
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  // Skip if pool is already closed
  if (poolClosed) {
    console.log('PostgreSQL pool already closed, skipping cleanup');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Drop tables from this benchmark
    await client.query(`DROP TABLE IF EXISTS ${TABLE_PREFIX}users CASCADE`);
    
    console.log('PostgreSQL tables cleaned successfully for find benchmark');
  } catch (error) {
    console.error('Error cleaning up PostgreSQL for find benchmark:', error);
  } finally {
    await client.release();
  }
}

/**
 * Get a random user ID from the database
 * This is used to prepare for benchmarking, but not part of the timed benchmark itself
 * @returns {Promise<number>} Random user ID
 */
async function getRandomUserId() {
  try {
    // Get a random user ID
    const randomUser = await db.oneOrNone(`SELECT id FROM ${TABLE_PREFIX}users LIMIT 1`);
    
    if (!randomUser) {
      throw new Error('No user found in the database');
    }
    
    return randomUser.id;
  } catch (error) {
    console.error('Error getting random user ID:', error);
    throw error;
  }
}

/**
 * Get a random country from the database
 * This is used to prepare for benchmarking, but not part of the timed benchmark itself
 * @returns {Promise<string>} Random country value
 */
async function getRandomCountry() {
  try {
    // Get a random country
    const randomCountry = await db.oneOrNone(`
      SELECT country FROM ${TABLE_PREFIX}users
      LIMIT 1
    `);
    
    if (!randomCountry) {
      throw new Error('No user found in the database');
    }
    
    return randomCountry.country;
  } catch (error) {
    console.error('Error getting random country:', error);
    throw error;
  }
}

/**
 * Find a record by ID
 * This function now accepts an ID parameter so we can separate the ID selection from the benchmark
 * @param {number} id The ID to search for
 * @returns {Promise<Object>} Query result
 */
async function findById(id) {
  try {
    // If no ID is provided, get a random ID (but this shouldn't happen in a benchmark)
    if (!id) {
      id = await getRandomUserId();
    }
    
    // Find user by ID (actual benchmark operation)
    const result = await db.one(`
      SELECT * FROM ${TABLE_PREFIX}users
      WHERE id = $1
    `, [id]);
    
    return result;
  } catch (error) {
    console.error('Error in PostgreSQL findById:', error);
    throw error;
  }
}

/**
 * Find records by an attribute
 * This function now accepts a country parameter so we can separate the attribute selection from the benchmark
 * @param {string} country The country to search for
 * @returns {Promise<Array>} Query results
 */
async function findByAttribute(country) {
  try {
    // If no country is provided, get a random country (but this shouldn't happen in a benchmark)
    if (!country) {
      country = await getRandomCountry();
    }
    
    // Find users by country (actual benchmark operation)
    const result = await db.manyOrNone(`
      SELECT * FROM ${TABLE_PREFIX}users
      WHERE country = $1
      LIMIT 20
    `, [country]);
    
    return result;
  } catch (error) {
    console.error('Error in PostgreSQL findByAttribute:', error);
    throw error;
  }
}

/**
 * Close PostgreSQL connection pool
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    if (!poolClosed) {
      await pool.end();
      poolClosed = true;
      console.log('PostgreSQL connection pool closed for find benchmark');
    } else {
      console.log('PostgreSQL pool already closed');
    }
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool:', error);
  }
}

module.exports = {
  setup,
  cleanup,
  findById,
  findByAttribute,
  getRandomUserId,
  getRandomCountry,
  closeConnection
}; 