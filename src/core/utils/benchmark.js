/**
 * Benchmark Utilities
 * 
 * Provides functions for running benchmarks, measuring performance,
 * and comparing results between MongoDB and PostgreSQL.
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const chalk = require('chalk');
const { getEnvironmentInfo } = require('./environment');

// Symbols to improve visualization
const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  faster: '🚀',
  slower: '🐢',
  similar: '⚖️'
};

/**
 * Run a benchmark function multiple times and collect performance metrics
 * @param {Function} benchmarkFn The benchmark function to run
 * @param {Array} args Arguments to pass to the benchmark function
 * @param {number} iterations Number of iterations to run
 * @returns {Object} Benchmark results
 */
async function runBenchmark(benchmarkFn, args = [], iterations = 5) {
  const results = {
    name: benchmarkFn.name,
    iterations: iterations,
    durations: [],
    min: Number.MAX_SAFE_INTEGER,
    max: 0,
    mean: 0,
    median: 0,
    stdDev: 0,
    args: args
  };
  
  console.log(chalk.dim(`\n${SYMBOLS.info} Running ${chalk.bold(benchmarkFn.name)} (${iterations} iterations)...`));
  
  // Run warm-up iteration (not counted in results)
  try {
    console.log(chalk.dim(`  ${SYMBOLS.info} Warm-up...`));
    await benchmarkFn(...args);
  } catch (error) {
    console.error(chalk.red(`  ${SYMBOLS.error} Error during warm-up: ${error.message}`));
  }
  
  // Run benchmark iterations
  const progressBar = Array(iterations).fill('□');
  
  for (let i = 0; i < iterations; i++) {
    try {
      const start = process.hrtime.bigint();
      const result = await benchmarkFn(...args);
      const end = process.hrtime.bigint();
      
      // Calculate duration in milliseconds
      const duration = Number(end - start) / 1_000_000;
      
      results.durations.push(duration);
      
      // Update min/max
      results.min = Math.min(results.min, duration);
      results.max = Math.max(results.max, duration);
      
      // Update progress bar
      progressBar[i] = '■';
      
      if (config && config.benchmark && config.benchmark.verbose) {
        console.log(`  ${SYMBOLS.success} Iteration ${i + 1}/${iterations}: ${chalk.cyan(duration.toFixed(2))}ms`);
        if (result) {
          console.log(chalk.dim(`    Result: ${JSON.stringify(result, null, 2)}`));
        }
      } else {
        // Show simple progress bar
        process.stdout.write(`\r  ${progressBar.join('')} ${i + 1}/${iterations}`);
      }
    } catch (error) {
      console.error(chalk.red(`\n  ${SYMBOLS.error} Error in iteration ${i + 1}: ${error.message}`));
      // Add a penalty duration for failed iterations
      results.durations.push(results.max > 0 ? results.max * 2 : 10000);
      progressBar[i] = chalk.red('✗');
    }
  }
  
  // Line break after progress bar
  if (!config?.benchmark?.verbose) {
    console.log();
  }
  
  // Calculate statistics
  if (results.durations.length > 0) {
    // Calculate mean
    results.mean = results.durations.reduce((sum, duration) => sum + duration, 0) / results.durations.length;
    
    // Calculate median
    const sortedDurations = [...results.durations].sort((a, b) => a - b);
    const middle = Math.floor(sortedDurations.length / 2);
    
    if (sortedDurations.length % 2 === 0) {
      results.median = (sortedDurations[middle - 1] + sortedDurations[middle]) / 2;
    } else {
      results.median = sortedDurations[middle];
    }
    
    // Calculate standard deviation
    const variance = results.durations.reduce((sum, duration) => {
      const diff = duration - results.mean;
      return sum + (diff * diff);
    }, 0) / results.durations.length;
    
    results.stdDev = Math.sqrt(variance);
    
    // Show summary statistics
    console.log(chalk.dim(`  ${SYMBOLS.info} Stats: min=${chalk.cyan(results.min.toFixed(2))}ms, max=${chalk.cyan(results.max.toFixed(2))}ms, mean=${chalk.cyan(results.mean.toFixed(2))}ms, median=${chalk.cyan(results.median.toFixed(2))}ms`));
  }
  
  return results;
}

/**
 * Compare benchmark results between MongoDB and PostgreSQL
 * @param {Object} mongoResults MongoDB benchmark results
 * @param {Object} pgResults PostgreSQL benchmark results
 * @returns {Object} Comparison results
 */
function compareResults(mongoResults, pgResults) {
  if (!mongoResults || !pgResults) {
    return { error: 'Missing results for comparison' };
  }
  
  const comparison = {
    meanDiff: pgResults.mean - mongoResults.mean,
    medianDiff: pgResults.median - mongoResults.median,
    minDiff: pgResults.min - mongoResults.min,
    maxDiff: pgResults.max - mongoResults.max,
    
    // Ratio of PostgreSQL time to MongoDB time
    // Values > 1 mean PostgreSQL is slower, values < 1 mean PostgreSQL is faster
    meanRatio: mongoResults.mean > 0 ? pgResults.mean / mongoResults.mean : 0,
    medianRatio: mongoResults.median > 0 ? pgResults.median / mongoResults.median : 0,
    
    // Winner based on median (more stable than mean)
    winner: mongoResults.median < pgResults.median ? 'mongodb' : 'postgresql',
    
    // Percentage difference (positive means PostgreSQL is slower, negative means faster)
    percentageDiff: mongoResults.median > 0 
      ? ((pgResults.median - mongoResults.median) / mongoResults.median) * 100
      : 0
  };
  
  return comparison;
}

/**
 * Print benchmark results to console
 * @param {string} title Title of the benchmark
 * @param {Object} mongoResults MongoDB benchmark results
 * @param {Object} pgResults PostgreSQL benchmark results
 */
function printResults(title, mongoResults, pgResults) {
  console.log(chalk.bold.blue(`\n┌─────────────────────────────────────────────┐`));
  console.log(chalk.bold.blue(`│ ${title.padEnd(43)} │`));
  console.log(chalk.bold.blue(`└─────────────────────────────────────────────┘`));
  
  if (mongoResults && pgResults) {
    const comparison = compareResults(mongoResults, pgResults);
    
    // Results table
    console.log(chalk.dim(`┌───────────────┬───────────┬───────────┬───────────┐`));
    console.log(chalk.dim(`│ Database      │ Median    │ Min       │ Max       │`));
    console.log(chalk.dim(`├───────────────┼───────────┼───────────┼───────────┤`));
    console.log(chalk.dim(`│ `) + chalk.yellow(`MongoDB      │ ${mongoResults.median.toFixed(2).padStart(7)}ms │ ${mongoResults.min.toFixed(2).padStart(7)}ms │ ${mongoResults.max.toFixed(2).padStart(7)}ms │`));
    console.log(chalk.dim(`│ `) + chalk.cyan(`PostgreSQL   │ ${pgResults.median.toFixed(2).padStart(7)}ms │ ${pgResults.min.toFixed(2).padStart(7)}ms │ ${pgResults.max.toFixed(2).padStart(7)}ms │`));
    console.log(chalk.dim(`└───────────────┴───────────┴───────────┴───────────┘`));
    
    const winner = comparison.winner === 'mongodb' ? 'MongoDB' : 'PostgreSQL';
    const loser = comparison.winner === 'mongodb' ? 'PostgreSQL' : 'MongoDB';
    const percentageDiff = Math.abs(comparison.percentageDiff).toFixed(2);
    
    // Comparison result
    if (Math.abs(comparison.percentageDiff) < 5) {
      console.log(`\n${SYMBOLS.similar} ${chalk.bold('Result:')} ${chalk.gray('Similar performance (within 5%)')}`);
    } else {
      // The faster system is the one with the lower median
      // If MongoDB won, it's faster (has lower median)
      // If PostgreSQL won, it's faster (has lower median)
      const winnerColor = comparison.winner === 'mongodb' ? chalk.yellow : chalk.cyan;
      
      // Always show the faster symbol for the winner
      const symbol = SYMBOLS.faster;
      
      // Show how much faster the winner is compared to the loser (in percentage)
      let fasterBy;
      if (comparison.winner === 'mongodb') {
        // MongoDB is faster - calculate how much faster (in %)
        fasterBy = ((pgResults.median - mongoResults.median) / pgResults.median * 100).toFixed(2);
      } else {
        // PostgreSQL is faster - calculate how much faster (in %)
        fasterBy = ((mongoResults.median - pgResults.median) / mongoResults.median * 100).toFixed(2);
      }
      
      console.log(`\n${symbol} ${chalk.bold('Result:')} ${winnerColor(winner)} is ${chalk.bold(fasterBy + '%')} faster than ${loser}`);
      
      // Additional details
      console.log(chalk.dim(`  • Time difference: ${Math.abs(comparison.medianDiff).toFixed(2)}ms`));
      console.log(chalk.dim(`  • Ratio: ${comparison.winner === 'mongodb' ? (1/comparison.medianRatio).toFixed(2) : comparison.medianRatio.toFixed(2)}x`));
    }
  } else {
    if (mongoResults) {
      console.log(`MongoDB median: ${mongoResults.median.toFixed(2)}ms (min: ${mongoResults.min.toFixed(2)}ms, max: ${mongoResults.max.toFixed(2)}ms)`);
    }
    
    if (pgResults) {
      console.log(`PostgreSQL median: ${pgResults.median.toFixed(2)}ms (min: ${pgResults.min.toFixed(2)}ms, max: ${pgResults.max.toFixed(2)}ms)`);
    }
  }
}

/**
 * Save benchmark results to file
 * @param {string} benchmarkName Name of the benchmark
 * @param {Object} results Benchmark results
 * @returns {Promise<string>} Path to the saved file
 */
async function saveResults(benchmarkName, results) {
  console.log(`\n${SYMBOLS.info} ${chalk.blue('Saving results for:')} ${chalk.bold(benchmarkName)}`);
  
  try {
    // Use the centralized configuration for output directory
    const outputDir = config.benchmark.outputDir;
    console.log(`${SYMBOLS.info} ${chalk.dim('Output directory:')} ${outputDir}`);
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `${benchmarkName}_${timestamp}.json`;
    const outputPath = path.join(outputDir, filename);
    console.log(`${SYMBOLS.info} ${chalk.dim('Output file:')} ${filename}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      console.log(`${SYMBOLS.info} ${chalk.dim('Creating output directory...')}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get environment information
    console.log(`${SYMBOLS.info} ${chalk.dim('Getting environment information...')}`);
    const environment = await getEnvironmentInfo();
    
    // Add metadata
    const resultsWithMeta = {
      benchmark: benchmarkName,
      timestamp: new Date().toISOString(),
      environment,
      config: {
        iterations: results.iterations,
        dataSize: results.dataSize || config.benchmark.dataSize || 'unknown'
      },
      results
    };
    
    // Write results to file
    console.log(`${SYMBOLS.info} ${chalk.dim('Writing results to file...')}`);
    fs.writeFileSync(outputPath, JSON.stringify(resultsWithMeta, null, 2));
    
    console.log(`\n${SYMBOLS.success} ${chalk.green('Results saved to:')} ${chalk.underline(outputPath)}`);
    
    return outputPath;
  } catch (error) {
    console.error(`\n${SYMBOLS.error} ${chalk.red('Error saving results:')} ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

module.exports = {
  runBenchmark,
  compareResults,
  printResults,
  saveResults
}; 