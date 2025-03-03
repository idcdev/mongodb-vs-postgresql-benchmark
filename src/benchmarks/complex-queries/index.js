/**
 * Complex Queries Benchmark
 * 
 * This benchmark compares MongoDB and PostgreSQL performance 
 * on complex queries like joins, aggregations, and data transformations.
 */

const { runBenchmark, compareResults, printResults } = require('../../core/utils/benchmark');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Set up benchmark environment
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  console.log('Setting up complex queries benchmark environment...');
  
  // Initialize collections/tables and insert test data
  await mongo.setup(options);
  await postgres.setup(options);
}

/**
 * Clean up benchmark environment
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  console.log('Cleaning up complex queries benchmark environment...');
  
  // Clean up collections/tables
  await mongo.cleanup(options);
  await postgres.cleanup(options);
}

/**
 * Run MongoDB aggregation for user posts
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoUserPostsAggregate(options = {}) {
  // Execute user posts aggregation
  const results = await mongo.userPostsAggregate();
  return { operation: 'user-posts-aggregate', results };
}

/**
 * Run MongoDB aggregation for popular posts
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoPopularPostsAggregate(options = {}) {
  // Execute popular posts aggregation
  const results = await mongo.popularPostsAggregate();
  return { operation: 'popular-posts-aggregate', results };
}

/**
 * Run PostgreSQL join for user posts
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgUserPostsJoin(options = {}) {
  // Execute user posts join
  const results = await postgres.userPostsJoin();
  return { operation: 'user-posts-join', results };
}

/**
 * Run PostgreSQL join for popular posts
 * @param {Object} options Additional options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgPopularPostsJoin(options = {}) {
  // Execute popular posts join
  const results = await postgres.popularPostsJoin();
  return { operation: 'popular-posts-join', results };
}

/**
 * Run all complex query benchmarks
 * @param {Object} options Configuration options
 * @returns {Promise<Object>} Benchmark results
 */
async function run(options = {}) {
  console.log('=== Running Complex Queries Benchmarks ===');
  
  // Number of iterations
  const iterations = options.iterations || 5;
  
  const results = {
    userPosts: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    popularPosts: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // User posts benchmark
  console.log('\nRunning user posts query benchmark...');
  
  const mongoUserPostsResults = await runBenchmark(
    mongoUserPostsAggregate, 
    [options], 
    iterations
  );
  
  const pgUserPostsResults = await runBenchmark(
    pgUserPostsJoin, 
    [options], 
    iterations
  );
  
  // Save user posts results
  printResults('User Posts Query Benchmark', mongoUserPostsResults, pgUserPostsResults);
  results.userPosts.mongodb = mongoUserPostsResults;
  results.userPosts.postgresql = pgUserPostsResults;
  results.userPosts.comparison = compareResults(mongoUserPostsResults, pgUserPostsResults);
  
  // Popular posts benchmark
  console.log('\nRunning popular posts query benchmark...');
  
  const mongoPopularPostsResults = await runBenchmark(
    mongoPopularPostsAggregate, 
    [options], 
    iterations
  );
  
  const pgPopularPostsResults = await runBenchmark(
    pgPopularPostsJoin, 
    [options], 
    iterations
  );
  
  // Save popular posts results
  printResults('Popular Posts Query Benchmark', mongoPopularPostsResults, pgPopularPostsResults);
  results.popularPosts.mongodb = mongoPopularPostsResults;
  results.popularPosts.postgresql = pgPopularPostsResults;
  results.popularPosts.comparison = compareResults(mongoPopularPostsResults, pgPopularPostsResults);
  
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