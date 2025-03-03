const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';

// MongoDB native driver connection
async function getMongoClient() {
  const client = new MongoClient(MONGO_URI, {
    // Removed deprecated options
  });
  
  await client.connect();
  return client;
}

// Mongoose connection
async function connectMongoose() {
  return mongoose.connect(MONGO_URI, {
    // Removed deprecated options
  });
}

// Get MongoDB database
async function getMongoDb() {
  const client = await getMongoClient();
  return client.db();
}

// Close MongoDB connection
async function closeMongoConnection(client) {
  if (client) {
    await client.close();
  }
}

module.exports = {
  getMongoClient,
  connectMongoose,
  getMongoDb,
  closeMongoConnection,
  MONGO_URI,
}; 