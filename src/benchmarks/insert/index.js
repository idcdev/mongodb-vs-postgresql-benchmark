/**
 * Insert Benchmark
 * 
 * This benchmark compares the performance of MongoDB and PostgreSQL
 * in simple and batch insert operations.
 */

const { runBenchmark, compareResults, printResults, saveResults } = require('../../core/utils/benchmark');
const { generateUsers } = require('./data-generator');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Set up benchmark environment
 * @param {Object} options - Configuration options
 */
async function setup(options = {}) {
  console.log('Setting up insert benchmark environment...');
  
  // Initialize collections/tables
  await mongo.setup(options);
  await postgres.setup(options);
}

/**
 * Clean up benchmark environment
 * @param {Object} options - Configuration options
 */
async function cleanup(options = {}) {
  console.log('Cleaning up insert benchmark environment...');
  
  // Clean collections/tables
  await mongo.cleanup(options);
  await postgres.cleanup(options);
}

/**
 * Run MongoDB single insert benchmark
 * @param {number} count - Number of documents
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function mongoSingleInsert(count, options = {}) {
  // Generate users for the test
  const users = generateUsers(count);
  
  // Insert one by one
  for (const user of users) {
    await mongo.insertUser(user);
  }
  
  return { count, operation: 'single-insert' };
}

/**
 * Run MongoDB batch insert benchmark
 * @param {number} count - Number of documents
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function mongoBatchInsert(count, options = {}) {
  // Generate users for the test
  const users = generateUsers(count);
  
  // Insert in batch
  await mongo.insertUsers(users);
  
  return { count, operation: 'batch-insert' };
}

/**
 * Run PostgreSQL single insert benchmark
 * @param {number} count - Number of records
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function pgSingleInsert(count, options = {}) {
  // Generate users for the test
  const users = generateUsers(count);
  
  // Insert one by one
  for (const user of users) {
    await postgres.insertUser(user);
  }
  
  return { count, operation: 'single-insert' };
}

/**
 * Run PostgreSQL batch insert benchmark
 * @param {number} count - Number of records
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function pgBatchInsert(count, options = {}) {
  // Generate users for the test
  const users = generateUsers(count);
  
  // Insert in batch
  await postgres.insertUsers(users);
  
  return { count, operation: 'batch-insert' };
}

/**
 * Run all insert benchmarks
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Benchmark results
 */
async function run(options = {}) {
  console.log('=== Running Insert Benchmarks ===');
  
  // Determine data size based on options
  const dataSize = getDataSize(options.size || 'small');
  const iterations = options.iterations || 5;
  
  const results = {
    singleInsert: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    batchInsert: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // Single insert benchmark
  console.log(`\nRunning single insert benchmark with ${dataSize} documents...`);
  
  const mongoSingleResults = await runBenchmark(
    mongoSingleInsert, 
    [dataSize, options], 
    iterations
  );
  
  const pgSingleResults = await runBenchmark(
    pgSingleInsert, 
    [dataSize, options], 
    iterations
  );
  
  // Save single insert results
  printResults('Single Insert Benchmark', mongoSingleResults, pgSingleResults);
  results.singleInsert.mongodb = mongoSingleResults;
  results.singleInsert.postgresql = pgSingleResults;
  results.singleInsert.comparison = compareResults(mongoSingleResults, pgSingleResults);
  
  // Batch insert benchmark
  console.log(`\nRunning batch insert benchmark with ${dataSize} documents...`);
  
  const mongoBatchResults = await runBenchmark(
    mongoBatchInsert, 
    [dataSize, options], 
    iterations
  );
  
  const pgBatchResults = await runBenchmark(
    pgBatchInsert, 
    [dataSize, options], 
    iterations
  );
  
  // Save batch insert results
  printResults('Batch Insert Benchmark', mongoBatchResults, pgBatchResults);
  results.batchInsert.mongodb = mongoBatchResults;
  results.batchInsert.postgresql = pgBatchResults;
  results.batchInsert.comparison = compareResults(mongoBatchResults, pgBatchResults);
  
  // Close database connections
  try {
    console.log('\nClosing database connections...');
    await mongo.closeConnection();
    await postgres.closeConnection();
    console.log('Database connections closed successfully.');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
  
  return results;
}

/**
 * Get data size based on name
 * @param {string} size - Name of size (small, medium, large)
 * @returns {number} - Number of documents
 */
function getDataSize(size) {
  const sizes = {
    small: 1000,
    medium: 10000,
    large: 100000
  };
  
  return sizes[size] || sizes.small;
}

module.exports = {
  setup,
  cleanup,
  run
}; 