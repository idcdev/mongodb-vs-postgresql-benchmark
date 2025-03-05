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
import { registerAllBenchmarks } from './core/benchmarks';
import { DataSize } from './core/domain/model/benchmark-options';
import { DatabaseType } from './core/domain/interfaces/database-adapter.interface';
import { MongoDBAdapter } from './core/application/database/mongodb-adapter';
import { PostgreSQLAdapter } from './core/application/database/postgresql-adapter';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

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

// Store database adapters
const adapters = new Map();
(global as any).adapters = adapters;

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
      console.log(`${index + 1}. ${chalk.cyan(benchmark.getName())}`);
      console.log(`   Description: ${benchmark.getDescription()}`);
      console.log(`   Supported databases: ${benchmark.getSupportedDatabases().join(', ')}`);
      console.log();
    });
  });

// Helper function to connect to databases
async function connectToDatabases(mongoUri?: string, _postgresUri?: string) {
  try {
    const config = configProvider;
    const mongoAdapter = new MongoDBAdapter(config);
    const postgresAdapter = new PostgreSQLAdapter(config);
    
    // Store adapters for later use
    adapters.set(DatabaseType.MONGODB, mongoAdapter);
    adapters.set(DatabaseType.POSTGRESQL, postgresAdapter);
    
    // MongoDB connection options
    const mongoOptions = {
      uri: mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark'
    };
    
    // PostgreSQL connection options
    const postgresOptions = {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'benchmark',
      ssl: false
    };
    
    console.log('Connecting to MongoDB with URI:', mongoOptions.uri);
    console.log('Connecting to PostgreSQL with options:', {
      host: postgresOptions.host,
      port: postgresOptions.port,
      user: postgresOptions.user,
      database: postgresOptions.database
    });
    
    // Connect to both databases
    await Promise.all([
      mongoAdapter.connect(mongoOptions),
      postgresAdapter.connect(postgresOptions)
    ]);
    
    // Register adapters with the benchmark service
    benchmarkService.registerDatabaseAdapter(mongoAdapter);
    benchmarkService.registerDatabaseAdapter(postgresAdapter);
    
    return true;
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    return false;
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
      console.warn(`Unknown data size: ${size}, defaulting to small`);
      return DataSize.SMALL;
  }
}

// Create the info command
program
  .command('info')
  .description('Show environment information')
  .action(async () => {
    console.log('\nEnvironment Information:\n');
    
    // System info
    console.log(chalk.cyan('System:'));
    console.log(`- Platform: ${process.platform}`);
    console.log(`- Architecture: ${process.arch}`);
    console.log(`- Node.js: ${process.version}`);
    
    // CPU info
    const cpuCount = require('os').cpus().length;
    console.log(`- CPU Cores: ${cpuCount}`);
    
    // Memory info
    const totalMemory = Math.round(require('os').totalmem() / (1024 * 1024 * 1024));
    console.log(`- Memory: ${totalMemory}GB`);
    
    // Database info
    console.log(chalk.cyan('\nDatabases:'));
    
    try {
      // Try to connect to MongoDB
      console.log('- MongoDB: Checking connection...');
      const connected = await connectToDatabases();
      
      if (connected) {
        console.log(chalk.green('  ✓ Connected to MongoDB and PostgreSQL'));
      } else {
        console.log(chalk.red('  ✗ Failed to connect to databases'));
      }
    } catch (error) {
      console.error(chalk.red('  ✗ Error checking database connections:'), error);
    }
    
    // Available benchmarks
    registerAllBenchmarks(benchmarkService);
    const benchmarks = benchmarkService.getAllBenchmarks();
    
    console.log(chalk.cyan('\nAvailable Benchmarks:'));
    console.log(`- Total: ${benchmarks.length} benchmarks`);
    
    // Group benchmarks by type
    const benchmarksByType = new Map<string, string[]>();
    
    benchmarks.forEach(benchmark => {
      const name = benchmark.getName();
      const type = name.includes('-') ? name.split('-')[0] : 'other';
      
      if (!benchmarksByType.has(type)) {
        benchmarksByType.set(type, []);
      }
      
      benchmarksByType.get(type)?.push(name);
    });
    
    benchmarksByType.forEach((benchmarkNames, type) => {
      console.log(`- ${chalk.yellow(type)}: ${benchmarkNames.length} benchmarks`);
    });
  });

// Create the run command
program
  .command('run [benchmarks...]')
  .description('Run one or more benchmarks')
  .option('-m, --mongo-uri <uri>', 'MongoDB connection URI')
  .option('-p, --postgres-uri <uri>', 'PostgreSQL connection URI')
  .option('-s, --size <size>', 'Data size (small, medium, large)', 'small')
  .option('-i, --iterations <number>', 'Number of iterations', '3')
  .option('-o, --output <dir>', 'Output directory for results', './benchmark-results')
  .option('--no-cleanup', 'Do not clean up after benchmarks')
  .option('-f, --format <format>', 'Output format (simple, detailed)', 'simple')
  .action(async (benchmarkNames, options) => {
    // Register all benchmarks
    registerAllBenchmarks(benchmarkService);
    
    // Connect to databases
    const connected = await connectToDatabases(options.mongoUri, options.postgresUri);
    if (!connected) {
      process.exit(1);
    }
    
    // Check if the last argument is a format option mistakenly passed as a benchmark name
    if (benchmarkNames.length > 0) {
      const lastArg = benchmarkNames[benchmarkNames.length - 1];
      if (lastArg === 'simple' || lastArg === 'detailed') {
        options.format = lastArg;
        benchmarkNames.pop(); // Remove the format from benchmark names
      }
    }
    
    console.log('\nRunning benchmarks with options:');
    console.log(`- Data size: ${options.size}`);
    console.log(`- Iterations: ${options.iterations}`);
    console.log(`- Output directory: ${options.output}`);
    console.log(`- Cleanup: ${options.cleanup ? 'Yes' : 'No'}`);
    console.log(`- Format: ${options.format}`);
    
    try {
      // Setup event listeners
      eventEmitter.on('benchmark:started', ({ name }: { name: string }) => {
        console.log(`\nRunning benchmark: ${chalk.cyan(name)}...`);
      });
      
      // Define a custom event handler for benchmark completion
      eventEmitter.removeAllListeners('benchmark:completed');
      eventEmitter.on('benchmark:completed', ({ result }: { result: any }) => {
        console.log(`\nBenchmark ${chalk.green(result.name)} completed.`);
        
        // Determine output format
        const format = options.format || 'simple';
        
        if (format === 'simple') {
          // Simple output format
          console.log(chalk.cyan('\nSummary:'));
          
          const summaryTable = new Table({
            head: [
              chalk.white('Database'),
              chalk.white('Median (ms)'),
              chalk.white('Mean (ms)'),
              chalk.white('Operations')
            ]
          });
          
          if (result.mongodb && result.mongodb.statistics) {
            summaryTable.push([
              chalk.yellow('MongoDB'),
              result.mongodb.statistics.medianDurationMs.toFixed(2),
              result.mongodb.statistics.meanDurationMs.toFixed(2),
              result.mongodb.operation?.count || 'N/A'
            ]);
          }
          
          if (result.postgresql && result.postgresql.statistics) {
            summaryTable.push([
              chalk.blue('PostgreSQL'),
              result.postgresql.statistics.medianDurationMs.toFixed(2),
              result.postgresql.statistics.meanDurationMs.toFixed(2),
              result.postgresql.operation?.count || 'N/A'
            ]);
          }
          
          console.log(summaryTable.toString());
          
          if (result.comparison) {
            const winner = result.comparison.winner;
            const percentageDiff = Math.abs(result.comparison.percentageDiff || 0).toFixed(2);
            console.log(`\n${chalk.bold('Winner')}: ${chalk.bold(winner)} is ${chalk.bold(percentageDiff)}% faster`);
          }
        } else if (format === 'detailed') {
          // Detailed output format with tables
          console.log(chalk.cyan('\nDetailed Results:'));
          
          // Create a table for statistics
          const statsTable = new Table({
            head: [
              chalk.white('Database'),
              chalk.white('Min (ms)'),
              chalk.white('Max (ms)'),
              chalk.white('Mean (ms)'),
              chalk.white('Median (ms)'),
              chalk.white('StdDev (ms)')
            ]
          });
          
          if (result.mongodb && result.mongodb.statistics) {
            statsTable.push([
              chalk.yellow('MongoDB'),
              result.mongodb.statistics.minDurationMs.toFixed(2),
              result.mongodb.statistics.maxDurationMs.toFixed(2),
              result.mongodb.statistics.meanDurationMs.toFixed(2),
              chalk.bold(result.mongodb.statistics.medianDurationMs.toFixed(2)),
              result.mongodb.statistics.stdDevDurationMs.toFixed(2)
            ]);
          }
          
          if (result.postgresql && result.postgresql.statistics) {
            statsTable.push([
              chalk.blue('PostgreSQL'),
              result.postgresql.statistics.minDurationMs.toFixed(2),
              result.postgresql.statistics.maxDurationMs.toFixed(2),
              result.postgresql.statistics.meanDurationMs.toFixed(2),
              chalk.bold(result.postgresql.statistics.medianDurationMs.toFixed(2)),
              result.postgresql.statistics.stdDevDurationMs.toFixed(2)
            ]);
          }
          
          console.log(statsTable.toString());
          
          // Show iteration details
          console.log(chalk.cyan('\nIterations:'));
          
          if (result.mongodb && result.mongodb.iterations) {
            console.log(chalk.yellow('\nMongoDB:'));
            const mongoTable = new Table({
              head: [chalk.white('Iteration'), chalk.white('Duration (ms)')]
            });
            
            result.mongodb.iterations.forEach((iter: any, index: number) => {
              mongoTable.push([
                index + 1,
                typeof iter === 'object' && 'durationMs' in iter 
                  ? iter.durationMs.toFixed(2)
                  : typeof iter === 'number' ? iter.toFixed(2) : 'N/A'
              ]);
            });
            
            console.log(mongoTable.toString());
          }
          
          if (result.postgresql && result.postgresql.iterations) {
            console.log(chalk.blue('\nPostgreSQL:'));
            const pgTable = new Table({
              head: [chalk.white('Iteration'), chalk.white('Duration (ms)')]
            });
            
            result.postgresql.iterations.forEach((iter: any, index: number) => {
              pgTable.push([
                index + 1,
                typeof iter === 'object' && 'durationMs' in iter 
                  ? iter.durationMs.toFixed(2)
                  : typeof iter === 'number' ? iter.toFixed(2) : 'N/A'
              ]);
            });
            
            console.log(pgTable.toString());
          }
          
          // Show comparison if available
          if (result.comparison) {
            console.log(chalk.cyan('\nComparison:'));
            const winner = result.comparison.winner;
            const percentageDiff = Math.abs(result.comparison.percentageDiff || 0).toFixed(2);
            
            const comparisonTable = new Table();
            
            comparisonTable.push(
              { 'Winner': chalk.bold(winner) },
              { 'Difference': `${chalk.bold(percentageDiff)}%` },
              { 'Median Ratio': result.comparison.medianRatio.toFixed(2) }
            );
            
            console.log(comparisonTable.toString());
          }
          
          // Show operation metadata
          if (result.mongodb && result.mongodb.operation) {
            console.log(chalk.cyan('\nOperation Details:'));
            
            const metadataTable = new Table();
            
            metadataTable.push(
              { 'Type': result.mongodb.operation.type },
              { 'Count': result.mongodb.operation.count }
            );
            
            if (result.mongodb.operation.metadata) {
              Object.entries(result.mongodb.operation.metadata).forEach(([key, value]) => {
                const row: Record<string, any> = {};
                row[key] = value;
                metadataTable.push(row);
              });
            }
            
            console.log(metadataTable.toString());
          }
        }
        
        // Show where results are saved
        const resultsDir = path.resolve(options.output);
        console.log(`\nFull results saved to JSON in: ${chalk.underline(resultsDir)}`);
      });
      
      eventEmitter.on('benchmark:error', ({ name, error }: { name: string, error: Error }) => {
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
      
      // Determine which benchmarks to run
      let benchmarksToRun: string[] = [];
      
      if (benchmarkNames.length === 0 || (benchmarkNames.length === 1 && benchmarkNames[0].toLowerCase() === 'all')) {
        // Run all benchmarks
        benchmarksToRun = benchmarkService.getAllBenchmarks().map(b => b.getName());
        console.log(`Running all ${benchmarksToRun.length} benchmark(s)...`);
      } else {
        // Filter out any non-benchmark arguments that might be mistaken for benchmark names
        const availableBenchmarks = benchmarkService.getAllBenchmarks().map(b => b.getName());
        benchmarksToRun = benchmarkNames.filter((name: string) => availableBenchmarks.includes(name));
        
        if (benchmarksToRun.length === 0) {
          console.error('No valid benchmarks specified. Available benchmarks:');
          availableBenchmarks.forEach(name => console.log(`- ${name}`));
          process.exit(1);
        }
        
        console.log(`Running ${benchmarksToRun.length} benchmark(s)...`);
      }
      
      // Run the benchmarks
      for (const benchmarkName of benchmarksToRun) {
        try {
          await benchmarkService.runBenchmark(benchmarkName, benchmarkOptions);
        } catch (error) {
          console.error(`Error running benchmark ${benchmarkName}:`, error);
        }
      }
      
      console.log(chalk.green('\nAll benchmarks completed successfully!'));
      console.log(`Results saved to: ${path.resolve(benchmarkOptions.outputDir)}`);
    } catch (error) {
      console.error('Error running benchmarks:', error);
    } finally {
      // Disconnect from databases
      for (const [, adapter] of adapters.entries()) {
        if (adapter.isConnected()) {
          await adapter.disconnect();
          console.log(`Disconnected from ${adapter.getDatabaseType ? adapter.getDatabaseType() : 'database'}`);
        }
      }
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (process.argv.length <= 2) {
  program.help();
} 