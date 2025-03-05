/**
 * Run Benchmarks
 * 
 * This script provides a simple way to run the benchmarks.
 * It loads the MongoDB and PostgreSQL adapters, configures the benchmark service,
 * and runs the benchmarks.
 */

import { DefaultConfigProvider } from './core/application/config/default-config-provider';
import { DefaultEventEmitter } from './core/application/events/default-event-emitter';
import { DefaultBenchmarkService } from './core/application/benchmark/default-benchmark-service';
import { DatabaseType } from './core/domain/interfaces/database-adapter.interface';
import { DataSize } from './core/domain/model/benchmark-options';

// Import database adapters
import { MongoDBAdapter } from './core/application/database/mongodb-adapter';
import { PostgreSQLAdapter } from './core/application/database/postgresql-adapter';

// Import benchmarks registry
import { registerAllBenchmarks } from './core/benchmarks';

/**
 * Configure and register database adapters
 * 
 * @param benchmarkService - The benchmark service
 * @param configProvider - The configuration provider
 * @param eventEmitter - The event emitter
 */
async function setupDatabaseAdapters(
  benchmarkService: DefaultBenchmarkService,
  configProvider: DefaultConfigProvider,
  eventEmitter: DefaultEventEmitter
): Promise<void> {
  console.log('Setting up database adapters...');
  
  // Create MongoDB adapter
  const mongoAdapter = new MongoDBAdapter(configProvider);
  
  // Register MongoDB event listeners
  eventEmitter.on('database:connecting', ({ type }) => {
    if (type === DatabaseType.MONGODB) {
      console.log('Connecting to MongoDB...');
    }
  });
  
  eventEmitter.on('database:connected', ({ type }) => {
    if (type === DatabaseType.MONGODB) {
      console.log('Successfully connected to MongoDB');
    }
  });
  
  // Create PostgreSQL adapter
  const postgresAdapter = new PostgreSQLAdapter(configProvider);
  
  // Register PostgreSQL event listeners
  eventEmitter.on('database:connecting', ({ type }) => {
    if (type === DatabaseType.POSTGRESQL) {
      console.log('Connecting to PostgreSQL...');
    }
  });
  
  eventEmitter.on('database:connected', ({ type }) => {
    if (type === DatabaseType.POSTGRESQL) {
      console.log('Successfully connected to PostgreSQL');
    }
  });
  
  // Register adapters with the benchmark service
  benchmarkService.registerDatabaseAdapter(mongoAdapter);
  benchmarkService.registerDatabaseAdapter(postgresAdapter);
  
  // Connect to databases
  try {
    console.log('Connecting to databases...');
    
    // MongoDB connection options
    const mongoOptions = {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/benchmark_db'
    };
    
    // PostgreSQL connection options
    const postgresOptions = {
      uri: process.env.POSTGRES_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark_db',
      ssl: false
    };
    
    // Connect to both databases
    await Promise.all([
      mongoAdapter.connect(mongoOptions),
      postgresAdapter.connect(postgresOptions)
    ]);
    
    console.log('Successfully connected to all databases');
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    throw error;
  }
}

/**
 * Main function to run benchmarks
 */
async function runBenchmarks() {
  console.log('Starting MongoDB vs PostgreSQL Benchmarks...');
  
  // Create dependencies
  const configProvider = new DefaultConfigProvider();
  const eventEmitter = new DefaultEventEmitter();
  
  // Create benchmark service
  const benchmarkService = new DefaultBenchmarkService(configProvider, eventEmitter);
  
  // Setup database adapters
  try {
    await setupDatabaseAdapters(benchmarkService, configProvider, eventEmitter);
  } catch (error) {
    console.error('Failed to setup database adapters:', error);
    process.exit(1);
  }
  
  // Register all benchmarks
  const registrationSuccess = registerAllBenchmarks(benchmarkService);
  if (!registrationSuccess) {
    console.error('Failed to register all benchmarks. Some benchmarks may not run correctly.');
  }
  
  // Remove existing event listeners to prevent duplicates
  eventEmitter.removeAllListeners('benchmark:started');
  eventEmitter.removeAllListeners('benchmark:completed');
  eventEmitter.removeAllListeners('benchmark:error');
  
  // Setup event listeners
  eventEmitter.on('benchmark:started', ({ name }) => {
    console.log(`\nRunning benchmark: ${name}...`);
  });
  
  eventEmitter.on('benchmark:completed', ({ result }) => {
    console.log(`Benchmark ${result.name} completed.`);
    console.log('Summary:');
    
    if (result.mongodb) {
      console.log(`- MongoDB: ${result.mongodb.summary.totalDurationMs}ms`);
    }
    
    if (result.postgresql) {
      console.log(`- PostgreSQL: ${result.postgresql.summary.totalDurationMs}ms`);
    }
    
    if (result.comparison) {
      console.log(`- Comparison: ${result.comparison.fasterDatabase} is ${result.comparison.percentageDifference.toFixed(2)}% faster`);
    }
  });
  
  eventEmitter.on('benchmark:error', ({ name, error }) => {
    console.error(`Error running benchmark ${name}:`, error);
  });
  
  // Run all benchmarks with small dataset
  try {
    console.log('\nRunning benchmarks with small dataset...');
    const options = {
      size: DataSize.SMALL,
      iterations: 3,
      setupEnvironment: true,
      cleanupEnvironment: true,
      saveResults: true,
      outputDir: './benchmark-results',
      databaseOptions: {
        mongodb: {},
        postgresql: {}
      }
    };
    
    // Get all registered benchmarks
    const benchmarks = benchmarkService.getAllBenchmarks();
    
    // Run each benchmark
    for (const benchmark of benchmarks) {
      await benchmarkService.runBenchmark(benchmark.getName(), options);
    }
    
    console.log('\nAll benchmarks completed successfully!');
  } catch (error) {
    console.error('Error running benchmarks:', error);
  } finally {
    // Disconnect from databases
    const mongoAdapter = benchmarkService.getDatabaseAdapter(DatabaseType.MONGODB);
    const postgresAdapter = benchmarkService.getDatabaseAdapter(DatabaseType.POSTGRESQL);
    
    if (mongoAdapter) {
      await mongoAdapter.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    if (postgresAdapter) {
      await postgresAdapter.disconnect();
      console.log('Disconnected from PostgreSQL');
    }
  }
}

// Run the benchmarks
runBenchmarks().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 