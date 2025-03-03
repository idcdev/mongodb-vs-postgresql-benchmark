const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';
const options = {
  // Removed deprecated options
};

/**
 * Get MongoDB client
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function getMongoClient() {
  try {
    const client = new MongoClient(MONGO_URI, options);
    await client.connect();
    return client;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

module.exports = {
  getMongoClient
}; 