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

// Import benchmarks registry
import { registerAllBenchmarks } from './core/benchmarks';

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
  
  // Register all benchmarks
  const registrationSuccess = registerAllBenchmarks(benchmarkService);
  if (!registrationSuccess) {
    console.error('Failed to register all benchmarks. Some benchmarks may not run correctly.');
  }
  
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
      outputDir: './benchmark-results'
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
  }
}

// Run the benchmarks
runBenchmarks().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 