#!/usr/bin/env node

/**
 * Run All Benchmarks in Sequence
 * 
 * This script runs all available benchmarks one after another,
 * each with its own isolated environment.
 */

const path = require('path');
const chalk = require('chalk');
const { runBenchmark, listBenchmarks } = require('./runner');
const { printEnvironmentInfo } = require('./utils/environment');

/**
 * Run all benchmarks in sequence
 * @param {Object} options - Command line options
 */
async function runAllBenchmarks(options = {}) {
  console.log(chalk.blue('=== Running All Benchmarks ==='));
  
  try {
    // Print environment information
    console.log(chalk.cyan('\nEnvironment Information:'));
    await printEnvironmentInfo();
    
    // Get list of available benchmarks
    const benchmarks = await listBenchmarks();
    console.log(chalk.cyan(`\nFound ${benchmarks.length} benchmarks: ${benchmarks.join(', ')}`));
    
    // Results for all benchmarks
    const allResults = {};
    
    // Run each benchmark
    for (const benchmark of benchmarks) {
      console.log(chalk.cyan(`\n========================================`));
      console.log(chalk.cyan(`Starting ${benchmark} benchmark...`));
      console.log(chalk.cyan(`========================================`));
      
      try {
        const benchmarkOptions = {
          ...options,
          setupEnvironment: true,
          cleanupEnvironment: true
        };
        
        // Run the benchmark
        const results = await runBenchmark(benchmark, benchmarkOptions);
        allResults[benchmark] = results;
        
        console.log(chalk.green(`\n✓ ${benchmark} benchmark completed successfully\n`));
      } catch (error) {
        console.error(chalk.red(`\n✗ ${benchmark} benchmark failed:`), error);
        allResults[benchmark] = { error: error.message };
      }
    }
    
    // Summary
    console.log(chalk.cyan('\n========================================'));
    console.log(chalk.cyan('Benchmark Summary:'));
    console.log(chalk.cyan('========================================\n'));
    
    for (const benchmark of benchmarks) {
      if (allResults[benchmark]?.error) {
        console.log(chalk.red(`✗ ${benchmark}: Failed - ${allResults[benchmark].error}`));
      } else {
        console.log(chalk.green(`✓ ${benchmark}: Completed successfully`));
      }
    }
    
    console.log(chalk.green('\nAll benchmarks execution completed.'));
    
    // Force process exit after benchmark completion
    console.log(chalk.dim('Waiting for connections to close before exiting...'));
    setTimeout(() => {
      process.exit(0);
    }, 2000);
    
    return allResults;
  } catch (error) {
    console.error(chalk.red('Error running all benchmarks:'), error);
    throw error;
  }
}

// If this script is run directly
if (require.main === module) {
  const options = {
    size: process.env.BENCHMARK_SIZE || 'small',
    iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '3'),
    saveResults: true
  };
  
  runAllBenchmarks(options).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = runAllBenchmarks; 