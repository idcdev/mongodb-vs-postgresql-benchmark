/**
 * Benchmark Runner Core
 * 
 * This is the main module that manages the execution of benchmarks
 * in an isolated and controlled manner.
 */

const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');
const { getEnvironmentInfo } = require('./utils/environment');
const { saveResults } = require('./utils/benchmark');
const config = require('./config');

// Symbols to improve visualization
const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  loading: '⏳',
  database: '🗄️',
  benchmark: '📊',
  setup: '🔧',
  cleanup: '🧹',
  execute: '▶️'
};

/**
 * Run a specific benchmark
 * @param {string} name - Benchmark name
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Benchmark results
 */
async function runBenchmark(name, options = {}) {
  console.log(chalk.bold.blue(`\n┌─────────────────────────────────────────────┐`));
  console.log(chalk.bold.blue(`│ ${SYMBOLS.benchmark} Benchmark: ${name.padEnd(31)} │`));
  console.log(chalk.bold.blue(`└─────────────────────────────────────────────┘`));
  
  try {
    // Dynamically load the benchmark
    const benchmarkPath = path.join(__dirname, '..', 'benchmarks', name);
    console.log(chalk.dim(`${SYMBOLS.loading} Loading benchmark from ${chalk.italic(benchmarkPath)}`));
    
    // Check if directory exists
    try {
      await fs.access(benchmarkPath);
    } catch (error) {
      console.error(chalk.red(`${SYMBOLS.error} Directory not found: ${benchmarkPath}`));
      throw new Error(`Benchmark directory "${name}" not found`);
    }
    
    // Check if index.js exists
    const indexPath = path.join(benchmarkPath, 'index.js');
    try {
      await fs.access(indexPath);
    } catch (error) {
      console.error(chalk.red(`${SYMBOLS.error} Index file not found: ${indexPath}`));
      throw new Error(`Benchmark index file not found in ${name}`);
    }
    
    // Load the module
    console.log(chalk.dim(`${SYMBOLS.loading} Loading module from ${chalk.italic(indexPath)}`));
    const benchmark = require(indexPath);
    console.log(chalk.green(`${SYMBOLS.success} Module loaded: ${chalk.bold(Object.keys(benchmark).join(', '))}`));
    
    // Check if the benchmark exists and has the run function
    if (!benchmark || typeof benchmark.run !== 'function') {
      console.error(chalk.red(`${SYMBOLS.error} Benchmark ${name} does not have a 'run' function`));
      throw new Error(`Invalid benchmark module: missing 'run' function`);
    }
    
    // Setup environment if needed
    if (options.setupEnvironment !== false && typeof benchmark.setup === 'function') {
      console.log(chalk.cyan(`${SYMBOLS.setup} Setting up ${name} benchmark environment...`));
      await benchmark.setup(options);
    }
    
    // Execute the benchmark
    console.log(chalk.yellow(`${SYMBOLS.execute} Executing ${name} benchmark...`));
    const results = await benchmark.run(options);
    
    // Cleanup environment if needed
    if (options.cleanupEnvironment !== false && typeof benchmark.cleanup === 'function') {
      console.log(chalk.cyan(`${SYMBOLS.cleanup} Cleaning up ${name} benchmark environment...`));
      await benchmark.cleanup(options);
    }
    
    // Save results if needed
    if (options.saveResults !== false && results) {
      await saveResults(name, results);
    }
    
    return results;
  } catch (error) {
    console.error(chalk.red(`${SYMBOLS.error} Error running ${name} benchmark: ${error.message}`));
    throw error;
  }
}

/**
 * Run all available benchmarks
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Results of all benchmarks
 */
async function runAllBenchmarks(options = {}) {
  console.log(chalk.bold.magenta(`\n┌─────────────────────────────────────────────┐`));
  console.log(chalk.bold.magenta(`│ ${SYMBOLS.benchmark} Executing All Benchmarks ${' '.repeat(12)} │`));
  console.log(chalk.bold.magenta(`└─────────────────────────────────────────────┘`));
  
  try {
    // Get list of available benchmarks
    const benchmarks = await listBenchmarks();
    
    if (benchmarks.length === 0) {
      console.log(chalk.yellow(`${SYMBOLS.warning} No benchmarks found`));
      return {};
    }
    
    console.log(chalk.cyan(`${SYMBOLS.info} Benchmarks found: ${chalk.bold(benchmarks.length)}`));
    
    const results = {};
    
    // Run each benchmark
    for (let i = 0; i < benchmarks.length; i++) {
      const benchmark = benchmarks[i];
      console.log(chalk.cyan(`\n${SYMBOLS.benchmark} Benchmark ${i + 1}/${benchmarks.length}: ${chalk.bold(benchmark)}`));
      
      try {
        results[benchmark] = await runBenchmark(benchmark, options);
        console.log(chalk.green(`${SYMBOLS.success} Benchmark ${benchmark} completed successfully`));
      } catch (error) {
        console.error(chalk.red(`${SYMBOLS.error} Failure in benchmark ${benchmark}: ${error.message}`));
        results[benchmark] = { error: error.message };
      }
    }
    
    console.log(chalk.green(`\n${SYMBOLS.success} All benchmarks completed`));
    return results;
  } catch (error) {
    console.error(chalk.red(`${SYMBOLS.error} Error running all benchmarks: ${error.message}`));
    throw error;
  }
}

/**
 * List all available benchmarks
 * @returns {Promise<Array<string>>} - List of benchmarks
 */
async function listBenchmarks() {
  try {
    const benchmarksDir = path.join(__dirname, '..', 'benchmarks');
    const entries = await fs.readdir(benchmarksDir, { withFileTypes: true });
    
    // Filter directories only
    const benchmarks = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(async name => {
        // Check if the directory has an index.js file
        try {
          await fs.access(path.join(benchmarksDir, name, 'index.js'));
          return true;
        } catch (error) {
          return false;
        }
      });
    
    return benchmarks;
  } catch (error) {
    console.error(chalk.red(`${SYMBOLS.error} Error listing benchmarks: ${error.message}`));
    return [];
  }
}

module.exports = {
  runBenchmark,
  runAllBenchmarks,
  listBenchmarks
}; 