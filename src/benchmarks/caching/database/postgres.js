/**
 * PostgreSQL operations for caching benchmark
 * 
 * This module implements PostgreSQL as a caching layer.
 */

const { Pool } = require('pg');
const pgp = require('pg-promise')();
require('dotenv').config();

// Prefix for tables in this benchmark
const TABLE_PREFIX = 'caching_';

// PostgreSQL connection URI
const PG_URI = process.env.PG_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark';

// PostgreSQL connection pool configuration
const pool = new Pool({ 
  connectionString: PG_URI,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000 // Close idle clients after 30 seconds
});

// Flag to track if the pool has been closed
let poolClosed = false;

// pg-promise efficiently manages connections via its own pool
const db = pgp(PG_URI);

/**
 * Set up PostgreSQL environment for the benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  const client = await pool.connect();
  
  try {
    // Create tables for the benchmark
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}cache (
        key TEXT PRIMARY KEY,
        value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        last_accessed TIMESTAMP
      )
    `);
    
    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${TABLE_PREFIX}cache_expires_idx 
      ON ${TABLE_PREFIX}cache(expires_at)
    `);
    
    console.log('PostgreSQL tables created successfully for caching benchmark');
  } catch (error) {
    console.error('Error setting up PostgreSQL for caching benchmark:', error);
  } finally {
    // Connection returned to the pool, not closed
    client.release();
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
  
  try {
    // Drop the cache table
    await db.none(`DROP TABLE IF EXISTS ${TABLE_PREFIX}cache`);
    
    console.log('PostgreSQL cache table dropped successfully');
  } catch (error) {
    console.error('Error cleaning up PostgreSQL cache:', error);
  }
}

/**
 * Set a cache entry
 * @param {string} key Cache key
 * @param {any} value Cache value
 * @param {number} ttl Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success indicator
 */
async function set(key, value, ttl = null) {
  try {
    const now = new Date();
    let expiresAt = null;
    
    // Add expiration if TTL is provided
    if (ttl) {
      expiresAt = new Date(now.getTime() + ttl * 1000);
    }
    
    // Use upsert to handle both insert and update
    await db.none(`
      INSERT INTO ${TABLE_PREFIX}cache(key, value, created_at, updated_at, expires_at)
      VALUES($1, $2, $3, $4, $5)
      ON CONFLICT(key) 
      DO UPDATE SET 
        value = $2,
        updated_at = $4,
        expires_at = $5
    `, [key, value, now, now, expiresAt]);
    
    return true;
  } catch (error) {
    console.error('Error setting cache in PostgreSQL:', error);
    return false;
  }
}

/**
 * Set multiple cache entries
 * @param {Array} entries Array of {key, value} objects
 * @param {number} ttl Time to live in seconds (optional)
 * @returns {Promise<boolean>} Success indicator
 */
async function mset(entries, ttl = null) {
  try {
    const now = new Date();
    let expiresAt = null;
    
    // Add expiration if TTL is provided
    if (ttl) {
      expiresAt = new Date(now.getTime() + ttl * 1000);
    }
    
    // Create column set for pg-promise
    const cs = new pgp.helpers.ColumnSet(
      ['key', 'value', 'created_at', 'updated_at', 'expires_at'],
      { table: `${TABLE_PREFIX}cache` }
    );
    
    // Prepare data for insertion
    const values = entries.map(({ key, value }) => ({
      key,
      value,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt
    }));
    
    // Generate upsert query
    const query = pgp.helpers.insert(values, cs) + 
      ' ON CONFLICT(key) DO UPDATE SET ' +
      'value = EXCLUDED.value, ' +
      'updated_at = EXCLUDED.updated_at, ' +
      'expires_at = EXCLUDED.expires_at';
    
    await db.none(query);
    
    return true;
  } catch (error) {
    console.error('Error setting multiple cache entries in PostgreSQL:', error);
    return false;
  }
}

/**
 * Get a cache entry
 * @param {string} key Cache key
 * @returns {Promise<any>} Cache value or null if not found
 */
async function get(key) {
  try {
    const now = new Date();
    
    // Get the cache entry and check expiration
    const result = await db.oneOrNone(`
      SELECT value 
      FROM ${TABLE_PREFIX}cache 
      WHERE key = $1 
        AND (expires_at IS NULL OR expires_at > $2)
    `, [key, now]);
    
    if (!result) {
      // Delete expired entry if it exists
      await db.none(`
        DELETE FROM ${TABLE_PREFIX}cache 
        WHERE key = $1 
          AND expires_at IS NOT NULL 
          AND expires_at <= $2
      `, [key, now]);
      
      return null;
    }
    
    // Update last accessed time
    await db.none(`
      UPDATE ${TABLE_PREFIX}cache 
      SET last_accessed = $1 
      WHERE key = $2
    `, [now, key]);
    
    return result.value;
  } catch (error) {
    console.error('Error getting cache from PostgreSQL:', error);
    return null;
  }
}

/**
 * Get multiple cache entries
 * @param {Array} keys Array of cache keys
 * @returns {Promise<Object>} Object mapping keys to values
 */
async function mget(keys) {
  try {
    const now = new Date();
    
    // Get all valid cache entries
    const results = await db.manyOrNone(`
      SELECT key, value 
      FROM ${TABLE_PREFIX}cache 
      WHERE key = ANY($1) 
        AND (expires_at IS NULL OR expires_at > $2)
    `, [keys, now]);
    
    // Delete expired entries
    await db.none(`
      DELETE FROM ${TABLE_PREFIX}cache 
      WHERE key = ANY($1) 
        AND expires_at IS NOT NULL 
        AND expires_at <= $2
    `, [keys, now]);
    
    // Update last accessed time for all retrieved entries
    if (results.length > 0) {
      const validKeys = results.map(r => r.key);
      await db.none(`
        UPDATE ${TABLE_PREFIX}cache 
        SET last_accessed = $1 
        WHERE key = ANY($2)
      `, [now, validKeys]);
    }
    
    // Convert results to key-value object
    const resultObj = {};
    for (const row of results) {
      resultObj[row.key] = row.value;
    }
    
    return resultObj;
  } catch (error) {
    console.error('Error getting multiple cache entries from PostgreSQL:', error);
    return {};
  }
}

/**
 * Delete a cache entry
 * @param {string} key Cache key
 * @returns {Promise<boolean>} Success indicator
 */
async function del(key) {
  try {
    const result = await db.result(`
      DELETE FROM ${TABLE_PREFIX}cache 
      WHERE key = $1
    `, [key]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting cache from PostgreSQL:', error);
    return false;
  }
}

/**
 * Delete multiple cache entries
 * @param {Array} keys Array of cache keys
 * @returns {Promise<number>} Number of entries deleted
 */
async function mdel(keys) {
  try {
    const result = await db.result(`
      DELETE FROM ${TABLE_PREFIX}cache 
      WHERE key = ANY($1)
    `, [keys]);
    
    return result.rowCount;
  } catch (error) {
    console.error('Error deleting multiple cache entries from PostgreSQL:', error);
    return 0;
  }
}

/**
 * Check if a cache entry exists
 * @param {string} key Cache key
 * @returns {Promise<boolean>} True if the key exists
 */
async function exists(key) {
  try {
    const now = new Date();
    
    const result = await db.oneOrNone(`
      SELECT 1 
      FROM ${TABLE_PREFIX}cache 
      WHERE key = $1 
        AND (expires_at IS NULL OR expires_at > $2)
      LIMIT 1
    `, [key, now]);
    
    return result !== null;
  } catch (error) {
    console.error('Error checking cache existence in PostgreSQL:', error);
    return false;
  }
}

/**
 * Clean expired cache entries
 * @returns {Promise<number>} Number of entries cleaned
 */
async function cleanExpired() {
  try {
    const now = new Date();
    
    const result = await db.result(`
      DELETE FROM ${TABLE_PREFIX}cache 
      WHERE expires_at IS NOT NULL 
        AND expires_at <= $1
    `, [now]);
    
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning expired cache entries from PostgreSQL:', error);
    return 0;
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
      console.log('PostgreSQL connection pool closed for caching benchmark');
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
  set,
  mset,
  get,
  mget,
  del,
  mdel,
  exists,
  cleanExpired,
  closeConnection
}; 