/**
 * Find Benchmark
 * 
 * This benchmark compares the performance of MongoDB and PostgreSQL
 * in search operations.
 */

const { runBenchmark, compareResults, printResults } = require('../../core/utils/benchmark');
const { generateUsers } = require('./data-generator');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Set up benchmark environment
 * @param {Object} options - Configuration options
 */
async function setup(options = {}) {
  console.log('Setting up find benchmark environment...');
  
  // Initialize collections/tables and insert data
  await mongo.setup(options);
  await postgres.setup(options);
}

/**
 * Clean up benchmark environment
 * @param {Object} options - Configuration options
 */
async function cleanup(options = {}) {
  console.log('Cleaning up find benchmark environment...');
  
  // Clean collections/tables
  await mongo.cleanup(options);
  await postgres.cleanup(options);
}

/**
 * Run MongoDB find by ID benchmark
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function mongoFindById(options = {}) {
  // Get a random ID BEFORE starting the benchmark measurement
  // This ensures that only the actual search operation is measured
  const randomId = options.randomUserId || await mongo.getRandomUserId();
  
  // Find by ID (only this operation will be timed)
  const results = await mongo.findById(randomId);
  return { operation: 'find-by-id', results };
}

/**
 * Run MongoDB find by attribute benchmark
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function mongoFindByAttribute(options = {}) {
  // Get a random country BEFORE starting the benchmark measurement
  // This ensures that only the actual search operation is measured
  const randomCountry = options.randomCountry || await mongo.getRandomCountry();
  
  // Find by attribute (only this operation will be timed)
  const results = await mongo.findByAttribute(randomCountry);
  return { operation: 'find-by-attribute', results };
}

/**
 * Run PostgreSQL find by ID benchmark
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function pgFindById(options = {}) {
  // Get a random ID BEFORE starting the benchmark measurement
  // This ensures that only the actual search operation is measured
  const randomId = options.randomUserId || await postgres.getRandomUserId();
  
  // Find by ID (only this operation will be timed)
  const results = await postgres.findById(randomId);
  return { operation: 'find-by-id', results };
}

/**
 * Run PostgreSQL find by attribute benchmark
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Benchmark results
 */
async function pgFindByAttribute(options = {}) {
  // Get a random country BEFORE starting the benchmark measurement
  // This ensures that only the actual search operation is measured
  const randomCountry = options.randomCountry || await postgres.getRandomCountry();
  
  // Find by attribute (only this operation will be timed)
  const results = await postgres.findByAttribute(randomCountry);
  return { operation: 'find-by-attribute', results };
}

/**
 * Run all find benchmarks
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Benchmark results
 */
async function run(options = {}) {
  console.log('=== Running Find Benchmarks ===');
  
  // Number of iterations
  const iterations = options.iterations || 5;
  
  const results = {
    findById: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    findByAttribute: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // Benchmark de busca por ID
  console.log('\nRunning find by ID benchmark...');
  
  // Prepare random ID for MongoDB - this keeps the same ID for all iterations
  const randomMongoUserId = await mongo.getRandomUserId();
  
  // Prepare random ID for PostgreSQL - this keeps the same ID for all iterations
  const randomPgUserId = await postgres.getRandomUserId();
  
  const mongoFindByIdResults = await runBenchmark(
    mongoFindById, 
    [{ ...options, randomUserId: randomMongoUserId }], 
    iterations
  );
  
  const pgFindByIdResults = await runBenchmark(
    pgFindById, 
    [{ ...options, randomUserId: randomPgUserId }], 
    iterations
  );
  
  // Salvar resultados de busca por ID
  printResults('Find by ID Benchmark', mongoFindByIdResults, pgFindByIdResults);
  results.findById.mongodb = mongoFindByIdResults;
  results.findById.postgresql = pgFindByIdResults;
  results.findById.comparison = compareResults(mongoFindByIdResults, pgFindByIdResults);
  
  // Benchmark de busca por atributo
  console.log('\nRunning find by attribute benchmark...');
  
  // Prepare random country for MongoDB - this keeps the same country for all iterations
  const randomMongoCountry = await mongo.getRandomCountry();
  
  // Prepare random country for PostgreSQL - this keeps the same country for all iterations
  const randomPgCountry = await postgres.getRandomCountry();
  
  const mongoFindByAttributeResults = await runBenchmark(
    mongoFindByAttribute, 
    [{ ...options, randomCountry: randomMongoCountry }], 
    iterations
  );
  
  const pgFindByAttributeResults = await runBenchmark(
    pgFindByAttribute, 
    [{ ...options, randomCountry: randomPgCountry }], 
    iterations
  );
  
  // Salvar resultados de busca por atributo
  printResults('Find by Attribute Benchmark', mongoFindByAttributeResults, pgFindByAttributeResults);
  results.findByAttribute.mongodb = mongoFindByAttributeResults;
  results.findByAttribute.postgresql = pgFindByAttributeResults;
  results.findByAttribute.comparison = compareResults(mongoFindByAttributeResults, pgFindByAttributeResults);
  
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

module.exports = {
  setup,
  cleanup,
  run
}; 