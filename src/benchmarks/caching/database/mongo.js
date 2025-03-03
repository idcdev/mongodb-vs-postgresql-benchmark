/**
 * MongoDB Adapter for Caching Benchmark
 * 
 * This module implements a caching layer using MongoDB.
 */

const { MongoClient } = require('mongodb');
const config = require('../../../core/config');

// Using persistent client and database connection
let client;
let db;
let collection;

// Flag to track if the client has been closed
let clientClosed = false;

/**
 * Set up MongoDB environment for caching benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  try {
    // Connect to MongoDB with optimized connection settings
    if (!client) {
      client = new MongoClient(config.mongodb.uri, {
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000
      });
      await client.connect();
      console.log('MongoDB connection established for caching benchmark');
    }
    
    // Get database and collection
    db = client.db(config.mongodb.database);
    
    // Create or clear the cache collection
    const collectionName = options.collection || 'cache';
    
    // Drop collection if it exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length > 0) {
      await db.collection(collectionName).drop();
    }
    
    // Create collection
    collection = await db.createCollection(collectionName);
    
    // Create TTL index
    await collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
    
    // Create key index
    await collection.createIndex({ key: 1 }, { unique: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting up MongoDB cache:', error);
    throw error;
  }
  // No client.close() here to keep connection open
}

/**
 * Clean up MongoDB environment for caching benchmark
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  // Skip if client is already closed
  if (clientClosed) {
    console.log('MongoDB client already closed, skipping cleanup');
    return;
  }
  
  try {
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    // Drop cache collection if it exists
    for (const collection of collections) {
      if (collection.name === 'cache') {
        await db.collection('cache').drop();
      }
    }
    
    console.log('MongoDB cache collection cleaned successfully');
  } catch (error) {
    console.error('Error cleaning up MongoDB cache:', error);
  }
}

/**
 * Set a cache entry
 * @param {string} key Cache key
 * @param {any} value Cache value
 * @param {number} ttl Time to live in seconds (optional)
 * @returns {Promise<Object>} Operation result
 */
async function set(key, value, ttl = null) {
  try {
    // Calculate expiration time if TTL is provided
    const expireAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    
    // Upsert the cache entry
    const result = await collection.updateOne(
      { key },
      { 
        $set: { 
          key, 
          value, 
          expireAt,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    
    return { success: true, result };
  } catch (error) {
    console.error('Error setting MongoDB cache entry:', error);
    throw error;
  }
}

/**
 * Set multiple cache entries
 * @param {Array<{key: string, value: any}>} entries Array of key-value pairs
 * @param {number} ttl Time to live in seconds (optional)
 * @returns {Promise<Object>} Operation result
 */
async function mset(entries, ttl = null) {
  try {
    if (!entries || entries.length === 0) {
      return { success: true, count: 0 };
    }
    
    // Calculate expiration time if TTL is provided
    const expireAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    const now = new Date();
    
    // Prepare bulk operations
    const operations = entries.map(entry => ({
      updateOne: {
        filter: { key: entry.key },
        update: { 
          $set: { 
            key: entry.key, 
            value: entry.value, 
            expireAt,
            updatedAt: now
          } 
        },
        upsert: true
      }
    }));
    
    // Execute bulk operation
    const result = await collection.bulkWrite(operations);
    
    return { success: true, count: entries.length, result };
  } catch (error) {
    console.error('Error setting multiple MongoDB cache entries:', error);
    throw error;
  }
}

/**
 * Get a cache entry
 * @param {string} key Cache key
 * @returns {Promise<any>} Cache value or null if not found
 */
async function get(key) {
  try {
    // Find the cache entry
    const entry = await collection.findOne({ key });
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (entry.expireAt && entry.expireAt < new Date()) {
      // Entry has expired but TTL index hasn't removed it yet
      await collection.deleteOne({ key });
      return null;
    }
    
    return entry.value;
  } catch (error) {
    console.error('Error getting MongoDB cache entry:', error);
    throw error;
  }
}

/**
 * Get multiple cache entries
 * @param {Array<string>} keys Array of cache keys
 * @returns {Promise<Array<{key: string, value: any}>>} Array of key-value pairs
 */
async function mget(keys) {
  try {
    if (!keys || keys.length === 0) {
      return [];
    }
    
    // Find all cache entries
    const entries = await collection.find({ key: { $in: keys } }).toArray();
    
    const now = new Date();
    const result = [];
    const expiredKeys = [];
    
    // Process entries
    for (const entry of entries) {
      // Check if entry has expired
      if (entry.expireAt && entry.expireAt < now) {
        expiredKeys.push(entry.key);
      } else {
        result.push({
          key: entry.key,
          value: entry.value
        });
      }
    }
    
    // Delete expired entries
    if (expiredKeys.length > 0) {
      await collection.deleteMany({ key: { $in: expiredKeys } });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting multiple MongoDB cache entries:', error);
    throw error;
  }
}

/**
 * Delete a cache entry
 * @param {string} key Cache key
 * @returns {Promise<boolean>} True if entry was deleted, false otherwise
 */
async function del(key) {
  try {
    const result = await collection.deleteOne({ key });
    return { success: true, deleted: result.deletedCount > 0 };
  } catch (error) {
    console.error('Error deleting MongoDB cache entry:', error);
    throw error;
  }
}

/**
 * Delete multiple cache entries
 * @param {Array<string>} keys Array of cache keys
 * @returns {Promise<Object>} Operation result
 */
async function mdel(keys) {
  try {
    if (!keys || keys.length === 0) {
      return { success: true, deleted: 0 };
    }
    
    const result = await collection.deleteMany({ key: { $in: keys } });
    return { success: true, deleted: result.deletedCount };
  } catch (error) {
    console.error('Error deleting multiple MongoDB cache entries:', error);
    throw error;
  }
}

/**
 * Check if a cache entry exists
 * @param {string} key Cache key
 * @returns {Promise<boolean>} True if entry exists, false otherwise
 */
async function exists(key) {
  try {
    const count = await collection.countDocuments({ 
      key,
      $or: [
        { expireAt: { $exists: false } },
        { expireAt: { $gt: new Date() } }
      ]
    }, { limit: 1 });
    
    return count > 0;
  } catch (error) {
    console.error('Error checking MongoDB cache entry existence:', error);
    throw error;
  }
}

/**
 * Clean expired cache entries
 * @returns {Promise<number>} Number of entries cleaned
 */
async function cleanExpired() {
  try {
    const result = await collection.deleteMany({
      expireAt: { $lt: new Date() }
    });
    
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning expired MongoDB cache entries:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (client && !clientClosed) {
    await client.close();
    client = null;
    db = null;
    collection = null;
    clientClosed = true;
    console.log('MongoDB connection closed for caching benchmark');
  } else if (clientClosed) {
    console.log('MongoDB client already closed');
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