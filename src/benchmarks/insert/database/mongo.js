/**
 * MongoDB operations for the insert benchmark
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Prefix for collections in this benchmark
const COLLECTION_PREFIX = 'insert_';

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';

// MongoDB connection singleton (persistent connection for benchmarks)
let cachedClient = null;

/**
 * Set up MongoDB environment for the benchmark
 * @param {Object} options - Configuration options
 */
async function setup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Create collections for the benchmark
    await db.createCollection(`${COLLECTION_PREFIX}users`);
    
    console.log('MongoDB collections created successfully for insert benchmark');
  } catch (error) {
    console.error('Error setting up MongoDB for insert benchmark:', error);
  }
  // We don't close the connection so it can be reused
}

/**
 * Clean up MongoDB environment for the benchmark
 * @param {Object} options - Configuration options
 */
async function cleanup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Delete benchmark collections
    await db.collection(`${COLLECTION_PREFIX}users`).drop();
    
    console.log('MongoDB collections cleaned successfully for insert benchmark');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('No collections to drop for insert benchmark');
    } else {
      console.error('Error cleaning up MongoDB for insert benchmark:', error);
    }
  } finally {
    // We only close the connection during final cleanup
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
    }
  }
}

/**
 * Insert a single user
 * @param {Object} user - User document
 * @returns {Promise<Object>} - Operation result
 */
async function insertUser(user) {
  const client = await getClient();
  const db = client.db();
  
  try {
    const result = await db.collection(`${COLLECTION_PREFIX}users`).insertOne(user);
    return result;
  } catch (error) {
    console.error('Error inserting user in MongoDB:', error);
    throw error;
  }
  // We don't close the connection after each operation for better performance
}

/**
 * Insert multiple users
 * @param {Array<Object>} users - Array of user documents
 * @returns {Promise<Object>} - Operation result
 */
async function insertUsers(users) {
  const client = await getClient();
  const db = client.db();
  
  try {
    const result = await db.collection(`${COLLECTION_PREFIX}users`).insertMany(users);
    return result;
  } catch (error) {
    console.error('Error inserting users in MongoDB:', error);
    throw error;
  }
  // We don't close the connection after each operation for better performance
}

/**
 * Get MongoDB client
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function getClient() {
  // Reuse existing connection if available
  if (cachedClient) {
    return cachedClient;
  }
  
  // Create a new connection if needed
  const client = new MongoClient(MONGO_URI, {
    // Connection pool settings
    maxPoolSize: 10,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });
  
  await client.connect();
  cachedClient = client;
  return client;
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log('MongoDB connection closed for insert benchmark');
  }
}

module.exports = {
  setup,
  cleanup,
  insertUser,
  insertUsers,
  closeConnection
}; 