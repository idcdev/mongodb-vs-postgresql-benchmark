/**
 * MongoDB operations for the find benchmark
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Prefix for collections in this benchmark
const COLLECTION_PREFIX = 'find_';

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';

// MongoDB connection singleton (persistent connection for benchmarks)
let cachedClient = null;

/**
 * Set up MongoDB environment for the benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Create collections for the benchmark
    await db.createCollection(`${COLLECTION_PREFIX}users`);
    
    // Insert test data
    const users = require('../data-generator').generateUsers(1000);
    
    // Insert users
    await db.collection(`${COLLECTION_PREFIX}users`).insertMany(users);
    
    console.log('MongoDB collections created and populated successfully for find benchmark');
  } catch (error) {
    console.error('Error setting up MongoDB for find benchmark:', error);
  } finally {
    // Don't close the client during setup/cleanup
    // Instead, we'll reuse the connection
  }
}

/**
 * Clean up MongoDB environment for the benchmark
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Drop collections from this benchmark
    await db.collection(`${COLLECTION_PREFIX}users`).drop();
    
    console.log('MongoDB collections cleaned successfully for find benchmark');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('No collections to drop for find benchmark');
    } else {
      console.error('Error cleaning up MongoDB for find benchmark:', error);
    }
  } finally {
    // Close the connection only during final cleanup
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
    }
  }
}

/**
 * Get a random user ID from the database
 * This is used to prepare for benchmarking, but not part of the timed benchmark itself
 * @returns {Promise<Object>} Random user document
 */
async function getRandomUserId() {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Find a random user
    const randomUser = await db.collection(`${COLLECTION_PREFIX}users`).findOne({});
    
    if (!randomUser) {
      throw new Error('No user found in collection');
    }
    
    return randomUser._id;
  } catch (error) {
    console.error('Error getting random user ID:', error);
    throw error;
  }
  // Don't close the connection here
}

/**
 * Get a random country from the database
 * This is used to prepare for benchmarking, but not part of the timed benchmark itself
 * @returns {Promise<string>} Random country value
 */
async function getRandomCountry() {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Find a random user to get a country
    const randomUser = await db.collection(`${COLLECTION_PREFIX}users`).findOne({});
    
    if (!randomUser) {
      throw new Error('No user found in collection');
    }
    
    return randomUser.address.country;
  } catch (error) {
    console.error('Error getting random country:', error);
    throw error;
  }
  // Don't close the connection here
}

/**
 * Find a document by ID
 * This function now accepts an ID parameter so we can separate the ID selection from the benchmark
 * @param {Object} id The MongoDB ObjectId to search for
 * @returns {Promise<Object>} Query result
 */
async function findById(id) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // If no ID is provided, get a random ID (but this shouldn't happen in a benchmark)
    if (!id) {
      id = await getRandomUserId();
    }
    
    // Use the ID to find the user (actual benchmark operation)
    const result = await db.collection(`${COLLECTION_PREFIX}users`).findOne({ _id: id });
    
    return result;
  } catch (error) {
    console.error('Error in MongoDB findById:', error);
    throw error;
  }
  // Don't close the connection after each query - this is the key optimization
}

/**
 * Find documents by an attribute
 * This function now accepts a country parameter so we can separate the attribute selection from the benchmark
 * @param {string} country The country to search for
 * @returns {Promise<Array>} Query results
 */
async function findByAttribute(country) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // If no country is provided, get a random country (but this shouldn't happen in a benchmark)
    if (!country) {
      country = await getRandomCountry();
    }
    
    // Find users by country (actual benchmark operation)
    const result = await db.collection(`${COLLECTION_PREFIX}users`)
      .find({ 'address.country': country })
      .limit(20)
      .toArray();
    
    return result;
  } catch (error) {
    console.error('Error in MongoDB findByAttribute:', error);
    throw error;
  }
  // Don't close the connection after each query - this is the key optimization
}

/**
 * Get MongoDB client
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function getClient() {
  // Reuse the existing connection if available
  if (cachedClient) {
    return cachedClient;
  }
  
  // Create a new connection if needed
  const client = new MongoClient(MONGO_URI, {
    // Added connection pooling options
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
    console.log('MongoDB connection closed for find benchmark');
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