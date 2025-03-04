#!/usr/bin/env node
/**
 * MongoDB vs PostgreSQL Benchmark CLI
 * 
 * Command-line interface for running benchmarks.
 */

import { Command } from 'commander';
import { DefaultConfigProvider } from './core/application/config/default-config-provider';
import { DefaultEventEmitter } from './core/application/events/default-event-emitter';
import { DefaultBenchmarkService } from './core/application/benchmark/default-benchmark-service';
import { DatabaseType } from './core/domain/interfaces/database-adapter.interface';
import { DataSize } from './core/domain/model/benchmark-options';
import { MongoDBAdapter } from './core/application/database/mongodb-adapter';
import { PostgreSQLAdapter } from './core/application/database/postgresql-adapter';
import { registerAllBenchmarks, benchmarks } from './core/benchmarks';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Create the CLI program
const program = new Command();

// Setup program metadata
program
  .name('mongo-x-postgres')
  .description('MongoDB vs PostgreSQL Benchmark CLI')
  .version('1.0.0');

// Create dependencies
const configProvider = new DefaultConfigProvider();
const eventEmitter = new DefaultEventEmitter();
const benchmarkService = new DefaultBenchmarkService(configProvider, eventEmitter);

// Create the list command
program
  .command('list')
  .description('List all available benchmarks')
  .action(() => {
    // Register all benchmarks
    registerAllBenchmarks(benchmarkService);
    
    // Get all registered benchmarks
    const availableBenchmarks = benchmarkService.getAllBenchmarks();
    
    console.log('\nAvailable benchmarks:\n');
    
    availableBenchmarks.forEach((benchmark, index) => {
      console.log(`${index + 1}. ${benchmark.getName()}`);
      console.log(`   Description: ${benchmark.getDescription()}`);
      console.log(`   Supported databases: ${benchmark.getSupportedDatabases().join(', ')}`);
      console.log();
    });
  });

// Helper function to connect to databases
async function connectToDatabases(mongoUri?: string, postgresUri?: string) {
  // Create adapters
  const mongoAdapter = new MongoDBAdapter(configProvider);
  const postgresAdapter = new PostgreSQLAdapter(configProvider);
  
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
    // MongoDB connection options
    const mongoOptions = {
      uri: mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/benchmark_db',
      useUnifiedTopology: true,
      useNewUrlParser: true
    };
    
    // PostgreSQL connection options
    const postgresOptions = {
      uri: postgresUri || process.env.POSTGRES_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark_db',
      ssl: false
    };
    
    // Connect to both databases
    await Promise.all([
      mongoAdapter.connect(mongoOptions),
      postgresAdapter.connect(postgresOptions)
    ]);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    return false;
  }
}

// Helper function to disconnect from databases
async function disconnectFromDatabases() {
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

// Helper function to parse data size
function parseDataSize(size: string): DataSize {
  switch (size.toLowerCase()) {
    case 'small':
      return DataSize.SMALL;
    case 'medium':
      return DataSize.MEDIUM;
    case 'large':
      return DataSize.LARGE;
    default:
      return DataSize.SMALL;
  }
}

// Create the run command
program
  .command('run')
  .description('Run one or more benchmarks')
  .argument('[benchmarks...]', 'Benchmark names to run (defaults to all)')
  .option('-m, --mongo-uri <uri>', 'MongoDB connection URI')
  .option('-p, --postgres-uri <uri>', 'PostgreSQL connection URI')
  .option('-s, --size <size>', 'Data size (small, medium, large)', 'small')
  .option('-i, --iterations <number>', 'Number of iterations', '3')
  .option('-o, --output <dir>', 'Output directory for results', './benchmark-results')
  .option('--no-cleanup', 'Do not clean up after benchmarks')
  .action(async (benchmarkNames, options) => {
    // Register all benchmarks
    registerAllBenchmarks(benchmarkService);
    
    // Connect to databases
    const connected = await connectToDatabases(options.mongoUri, options.postgresUri);
    if (!connected) {
      process.exit(1);
    }
    
    try {
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
      
      // Parse options
      const benchmarkOptions = {
        size: parseDataSize(options.size),
        iterations: parseInt(options.iterations, 10),
        setupEnvironment: true,
        cleanupEnvironment: options.cleanup !== false,
        saveResults: true,
        outputDir: options.output,
        databaseOptions: {
          mongodb: {},
          postgresql: {}
        }
      };
      
      // Ensure output directory exists
      if (!fs.existsSync(benchmarkOptions.outputDir)) {
        fs.mkdirSync(benchmarkOptions.outputDir, { recursive: true });
      }
      
      console.log(`\nRunning benchmarks with options:
- Data size: ${options.size}
- Iterations: ${options.iterations}
- Output directory: ${benchmarkOptions.outputDir}
- Cleanup: ${benchmarkOptions.cleanupEnvironment ? 'Yes' : 'No'}
`);
      
      // Determine which benchmarks to run
      let benchmarksToRun = benchmarkService.getAllBenchmarks();
      
      if (benchmarkNames.length > 0) {
        benchmarksToRun = benchmarksToRun.filter(benchmark => 
          benchmarkNames.includes(benchmark.getName())
        );
        
        if (benchmarksToRun.length === 0) {
          console.error('No matching benchmarks found. Use the "list" command to see available benchmarks.');
          return;
        }
      }
      
      console.log(`Running ${benchmarksToRun.length} benchmark(s)...\n`);
      
      // Run each benchmark
      for (const benchmark of benchmarksToRun) {
        await benchmarkService.runBenchmark(benchmark.getName(), benchmarkOptions);
      }
      
      console.log('\nAll benchmarks completed successfully!');
      console.log(`Results saved to: ${path.resolve(benchmarkOptions.outputDir)}`);
      
    } catch (error) {
      console.error('Error running benchmarks:', error);
    } finally {
      // Disconnect from databases
      await disconnectFromDatabases();
    }
  });

// Create the info command
program
  .command('info')
  .description('Show detailed information about a benchmark')
  .argument('<benchmark>', 'Name of the benchmark')
  .action((benchmarkName) => {
    // Register all benchmarks
    registerAllBenchmarks(benchmarkService);
    
    // Get the specified benchmark
    const benchmark = benchmarkService.getBenchmark(benchmarkName);
    
    if (!benchmark) {
      console.error(`Benchmark "${benchmarkName}" not found. Use the "list" command to see available benchmarks.`);
      return;
    }
    
    console.log(`\nBenchmark: ${benchmark.getName()}`);
    console.log(`Description: ${benchmark.getDescription()}`);
    console.log(`Supported databases: ${benchmark.getSupportedDatabases().join(', ')}`);
    
    const defaultOptions = benchmark.getDefaultOptions();
    console.log('\nDefault options:');
    console.log(`- Data size: ${defaultOptions.size}`);
    console.log(`- Iterations: ${defaultOptions.iterations}`);
    console.log(`- Setup environment: ${defaultOptions.setupEnvironment}`);
    console.log(`- Cleanup environment: ${defaultOptions.cleanupEnvironment}`);
    console.log(`- Save results: ${defaultOptions.saveResults}`);
    console.log(`- Output directory: ${defaultOptions.outputDir}`);
  });

// Parse command line arguments
program.parse();

// If no arguments were provided, show help
if (process.argv.length === 2) {
  program.help();
} 