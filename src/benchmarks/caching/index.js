/**
 * Caching Benchmark
 * 
 * This benchmark compares MongoDB and PostgreSQL as caching layers,
 * measuring performance for storing and retrieving frequently accessed data.
 */

const { runBenchmark, compareResults, printResults } = require('../../core/utils/benchmark');
const dataGenerator = require('./data-generator');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Set up benchmark environment
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  console.log('Setting up caching benchmark environment...');
  
  try {
    // Initialize collections/tables
    await mongo.setup(options);
    await postgres.setup(options);
  } catch (error) {
    console.error('Error setting up caching benchmark:', error);
    throw error;
  }
}

/**
 * Clean up benchmark environment
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  console.log('Cleaning up caching benchmark environment...');
  
  try {
    // Clean up collections/tables
    await mongo.cleanup(options);
    await postgres.cleanup(options);
  } catch (error) {
    console.error('Error cleaning up caching benchmark:', error);
    throw error;
  }
}

/**
 * Run MongoDB single set/get benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoSingleSetGet(options = {}) {
  const key = dataGenerator.generateCacheKey();
  const value = dataGenerator.generateJsonValue(options.complexity || 3);
  
  // Set the value
  await mongo.set(key, value, options.ttl);
  
  // Get the value
  const result = await mongo.get(key);
  
  return { operation: 'single-set-get', key, result };
}

/**
 * Run PostgreSQL single set/get benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgSingleSetGet(options = {}) {
  const key = dataGenerator.generateCacheKey();
  const value = dataGenerator.generateJsonValue(options.complexity || 3);
  
  // Set the value
  await postgres.set(key, value, options.ttl);
  
  // Get the value
  const result = await postgres.get(key);
  
  return { operation: 'single-set-get', key, result };
}

/**
 * Run MongoDB bulk set benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoBulkSet(options = {}) {
  const count = options.count || 1000;
  const valueType = options.valueType || 'json';
  const valueSize = options.valueSize || 100;
  const complexity = options.complexity || 3;
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType,
    valueSize,
    complexity
  });
  
  // Set all entries
  await mongo.mset(entries, options.ttl);
  
  return { operation: 'bulk-set', count, valueType };
}

/**
 * Run PostgreSQL bulk set benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgBulkSet(options = {}) {
  const count = options.count || 1000;
  const valueType = options.valueType || 'json';
  const valueSize = options.valueSize || 100;
  const complexity = options.complexity || 3;
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType,
    valueSize,
    complexity
  });
  
  // Set all entries
  await postgres.mset(entries, options.ttl);
  
  return { operation: 'bulk-set', count, valueType };
}

/**
 * Run MongoDB hot keys access pattern benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoHotKeysAccess(options = {}) {
  const count = options.count || 1000;
  const operations = options.operations || 5000;
  const valueType = options.valueType || 'json';
  const valueSize = options.valueSize || 100;
  const complexity = options.complexity || 3;
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType,
    valueSize,
    complexity
  });
  
  // Set all entries
  await mongo.mset(entries, options.ttl);
  
  // Generate access pattern
  const keys = entries.map(entry => entry.key);
  const accessPattern = dataGenerator.generateAccessPattern(keys, {
    operations,
    hotKeysPercentage: options.hotKeysPercentage || 20,
    hotKeyAccessPercentage: options.hotKeyAccessPercentage || 80
  });
  
  // Execute access pattern
  let hits = 0;
  let misses = 0;
  
  for (const key of accessPattern) {
    const value = await mongo.get(key);
    if (value) {
      hits++;
    } else {
      misses++;
    }
  }
  
  return { 
    operation: 'hot-keys-access', 
    operations, 
    hits, 
    misses, 
    hitRate: (hits / operations) * 100 
  };
}

/**
 * Run PostgreSQL hot keys access pattern benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgHotKeysAccess(options = {}) {
  const count = options.count || 1000;
  const operations = options.operations || 5000;
  const valueType = options.valueType || 'json';
  const valueSize = options.valueSize || 100;
  const complexity = options.complexity || 3;
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType,
    valueSize,
    complexity
  });
  
  // Set all entries
  await postgres.mset(entries, options.ttl);
  
  // Generate access pattern
  const keys = entries.map(entry => entry.key);
  const accessPattern = dataGenerator.generateAccessPattern(keys, {
    operations,
    hotKeysPercentage: options.hotKeysPercentage || 20,
    hotKeyAccessPercentage: options.hotKeyAccessPercentage || 80
  });
  
  // Execute access pattern
  let hits = 0;
  let misses = 0;
  
  for (const key of accessPattern) {
    const value = await postgres.get(key);
    if (value) {
      hits++;
    } else {
      misses++;
    }
  }
  
  return { 
    operation: 'hot-keys-access', 
    operations, 
    hits, 
    misses, 
    hitRate: (hits / operations) * 100 
  };
}

/**
 * Run MongoDB TTL expiration benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function mongoTtlExpiration(options = {}) {
  const count = options.count || 100;
  const ttl = options.ttl || 1; // 1 second TTL
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType: 'simple',
    valueSize: 10
  });
  
  // Set all entries with TTL
  await mongo.mset(entries, ttl);
  
  // Wait for TTL to expire
  await new Promise(resolve => setTimeout(resolve, ttl * 1000 + 500));
  
  // Check how many entries are still there
  let remainingCount = 0;
  for (const entry of entries) {
    const value = await mongo.get(entry.key);
    if (value) {
      remainingCount++;
    }
  }
  
  return { 
    operation: 'ttl-expiration', 
    count, 
    ttl, 
    remainingCount,
    expirationRate: ((count - remainingCount) / count) * 100 
  };
}

/**
 * Run PostgreSQL TTL expiration benchmark
 * @param {Object} options Benchmark options
 * @returns {Promise<Object>} Benchmark results
 */
async function pgTtlExpiration(options = {}) {
  const count = options.count || 100;
  const ttl = options.ttl || 1; // 1 second TTL
  
  // Generate cache entries
  const entries = dataGenerator.generateCacheEntries({
    count,
    valueType: 'simple',
    valueSize: 10
  });
  
  // Set all entries with TTL
  await postgres.mset(entries, ttl);
  
  // Wait for TTL to expire
  await new Promise(resolve => setTimeout(resolve, ttl * 1000 + 500));
  
  // Check how many entries are still there
  let remainingCount = 0;
  for (const entry of entries) {
    const value = await postgres.get(entry.key);
    if (value) {
      remainingCount++;
    }
  }
  
  // Clean expired entries
  const cleanedCount = await postgres.cleanExpired();
  
  return { 
    operation: 'ttl-expiration', 
    count, 
    ttl, 
    remainingCount,
    cleanedCount,
    expirationRate: ((count - remainingCount) / count) * 100 
  };
}

/**
 * Run all caching benchmarks
 * @param {Object} options Configuration options
 * @returns {Promise<Object>} Benchmark results
 */
async function run(options = {}) {
  console.log('=== Running Caching Benchmarks ===');
  
  // Determine data size based on options
  const dataSize = options.size || 'small';
  const iterations = options.iterations || 5;
  
  // Configure benchmark parameters based on data size
  const benchmarkOptions = {
    small: {
      count: 1000,
      operations: 5000,
      valueSize: 100,
      complexity: 2
    },
    medium: {
      count: 10000,
      operations: 50000,
      valueSize: 500,
      complexity: 3
    },
    large: {
      count: 100000,
      operations: 500000,
      valueSize: 1000,
      complexity: 5
    }
  }[dataSize] || benchmarkOptions.small;
  
  // Combine with user options
  const finalOptions = { ...benchmarkOptions, ...options };
  
  const results = {
    singleSetGet: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    bulkSet: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    hotKeysAccess: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    ttlExpiration: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // Single set/get benchmark
  console.log('\nRunning single set/get benchmark...');
  
  const mongoSingleResults = await runBenchmark(
    mongoSingleSetGet, 
    [finalOptions], 
    iterations
  );
  
  const pgSingleResults = await runBenchmark(
    pgSingleSetGet, 
    [finalOptions], 
    iterations
  );
  
  printResults('Single Set/Get Benchmark', mongoSingleResults, pgSingleResults);
  results.singleSetGet.mongodb = mongoSingleResults;
  results.singleSetGet.postgresql = pgSingleResults;
  results.singleSetGet.comparison = compareResults(mongoSingleResults, pgSingleResults);
  
  // Bulk set benchmark
  console.log('\nRunning bulk set benchmark...');
  
  const mongoBulkResults = await runBenchmark(
    mongoBulkSet, 
    [finalOptions], 
    iterations
  );
  
  const pgBulkResults = await runBenchmark(
    pgBulkSet, 
    [finalOptions], 
    iterations
  );
  
  printResults('Bulk Set Benchmark', mongoBulkResults, pgBulkResults);
  results.bulkSet.mongodb = mongoBulkResults;
  results.bulkSet.postgresql = pgBulkResults;
  results.bulkSet.comparison = compareResults(mongoBulkResults, pgBulkResults);
  
  // Hot keys access pattern benchmark
  console.log('\nRunning hot keys access pattern benchmark...');
  
  // Use smaller operation count for this benchmark to keep runtime reasonable
  const hotKeysOptions = {
    ...finalOptions,
    operations: Math.min(finalOptions.operations, 1000)
  };
  
  const mongoHotKeysResults = await runBenchmark(
    mongoHotKeysAccess, 
    [hotKeysOptions], 
    Math.min(iterations, 3) // Fewer iterations for this test
  );
  
  const pgHotKeysResults = await runBenchmark(
    pgHotKeysAccess, 
    [hotKeysOptions], 
    Math.min(iterations, 3) // Fewer iterations for this test
  );
  
  printResults('Hot Keys Access Pattern Benchmark', mongoHotKeysResults, pgHotKeysResults);
  results.hotKeysAccess.mongodb = mongoHotKeysResults;
  results.hotKeysAccess.postgresql = pgHotKeysResults;
  results.hotKeysAccess.comparison = compareResults(mongoHotKeysResults, pgHotKeysResults);
  
  // TTL expiration benchmark
  console.log('\nRunning TTL expiration benchmark...');
  
  const ttlOptions = {
    ...finalOptions,
    count: 100, // Small count for TTL test
    ttl: 1 // 1 second TTL
  };
  
  const mongoTtlResults = await runBenchmark(
    mongoTtlExpiration, 
    [ttlOptions], 
    Math.min(iterations, 3) // Fewer iterations for this test
  );
  
  const pgTtlResults = await runBenchmark(
    pgTtlExpiration, 
    [ttlOptions], 
    Math.min(iterations, 3) // Fewer iterations for this test
  );
  
  printResults('TTL Expiration Benchmark', mongoTtlResults, pgTtlResults);
  results.ttlExpiration.mongodb = mongoTtlResults;
  results.ttlExpiration.postgresql = pgTtlResults;
  results.ttlExpiration.comparison = compareResults(mongoTtlResults, pgTtlResults);
  
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