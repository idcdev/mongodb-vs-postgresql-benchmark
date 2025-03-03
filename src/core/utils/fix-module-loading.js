/**
 * Utility to fix module loading issues in the benchmark runner
 * 
 * This script helps with common module loading issues:
 * 1. Ensures index.js files exist in benchmark directories
 * 2. Verifies module exports match expected pattern
 * 3. Creates symlinks if needed for proper resolution
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

/**
 * Check and fix benchmark module
 * @param {string} benchmarkName - Name of benchmark to fix
 * @returns {Promise<boolean>} - Whether fixes were applied
 */
async function fixBenchmarkModule(benchmarkName) {
  console.log(chalk.blue(`Checking ${benchmarkName} benchmark module...`));
  
  const benchmarkPath = path.join(process.cwd(), 'src', 'benchmarks', benchmarkName);
  const indexPath = path.join(benchmarkPath, 'index.js');
  
  try {
    // Check if benchmark directory exists
    try {
      await fs.access(benchmarkPath);
    } catch (error) {
      console.error(chalk.red(`Benchmark directory not found: ${benchmarkPath}`));
      return false;
    }
    
    // Check if index.js exists
    let indexExists = true;
    try {
      await fs.access(indexPath);
    } catch (error) {
      console.log(chalk.yellow(`Index file not found: ${indexPath}`));
      indexExists = false;
    }
    
    // If index.js exists, check its exports
    if (indexExists) {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      
      // Check if module exports proper functions
      if (!indexContent.includes('module.exports') || 
          !indexContent.includes('setup') ||
          !indexContent.includes('cleanup') ||
          !indexContent.includes('run')) {
        console.log(chalk.yellow(`Index file has incorrect exports. Will fix.`));
        indexExists = false;
      }
    }
    
    // Fix index.js if needed
    if (!indexExists) {
      console.log(chalk.blue(`Creating proper index.js for ${benchmarkName} benchmark`));
      
      // Generate index.js content
      const indexContent = generateIndexFile(benchmarkName);
      
      // Write the file
      await fs.writeFile(indexPath, indexContent);
      console.log(chalk.green(`Created index.js for ${benchmarkName} benchmark`));
      return true;
    }
    
    console.log(chalk.green(`${benchmarkName} benchmark module is valid`));
    return false;
  } catch (error) {
    console.error(chalk.red(`Error fixing ${benchmarkName} benchmark:`), error);
    return false;
  }
}

/**
 * Generate index.js file content
 * @param {string} benchmarkName - Name of benchmark
 * @returns {string} - Index file content
 */
function generateIndexFile(benchmarkName) {
  return `/**
 * ${formatBenchmarkName(benchmarkName)} Benchmark
 * 
 * This file was auto-generated to ensure proper module exports.
 */

const mongo = require('./database/mongo');
const postgres = require('./database/postgres');
const { runBenchmark, compareResults, printResults } = require('../../core/utils/benchmark');

/**
 * Set up benchmark environment
 * @param {Object} options - Configuration options
 */
async function setup(options = {}) {
  console.log('Setting up ${benchmarkName} benchmark environment...');
  
  try {
    // Initialize collections/tables and insert test data
    await mongo.setup(options);
    await postgres.setup(options);
  } catch (error) {
    console.error('Error setting up ${benchmarkName} benchmark:', error);
    throw error;
  }
}

/**
 * Clean up benchmark environment
 * @param {Object} options - Configuration options
 */
async function cleanup(options = {}) {
  console.log('Cleaning up ${benchmarkName} benchmark environment...');
  
  try {
    // Clean up collections/tables
    await mongo.cleanup(options);
    await postgres.cleanup(options);
  } catch (error) {
    console.error('Error cleaning up ${benchmarkName} benchmark:', error);
    throw error;
  }
}

/**
 * Run the benchmark
 * @param {Object} options - Configuration options
 */
async function run(options = {}) {
  console.log('=== Running ${formatBenchmarkName(benchmarkName)} Benchmark ===');
  
  // Number of iterations
  const iterations = options.iterations || 5;
  
  // Initialize results object
  const results = {};
  
  try {
    // Get MongoDB operations
    const mongoOperations = Object.keys(mongo)
      .filter(key => key !== 'setup' && key !== 'cleanup' && typeof mongo[key] === 'function');
    
    // Get PostgreSQL operations
    const pgOperations = Object.keys(postgres)
      .filter(key => key !== 'setup' && key !== 'cleanup' && typeof postgres[key] === 'function');
    
    // Run each operation
    for (const operation of mongoOperations) {
      if (!results[operation]) {
        results[operation] = {
          mongodb: null,
          postgresql: null,
          comparison: null
        };
      }
      
      console.log(\`\\nRunning \${operation} benchmark...\`);
      
      // Find matching PG operation
      const pgOperation = pgOperations.find(op => 
        op.replace(/Join$/, '').toLowerCase() === 
        operation.replace(/Aggregate$/, '').toLowerCase()
      );
      
      if (!pgOperation) {
        console.warn(\`No matching PostgreSQL operation found for \${operation}\`);
        continue;
      }
      
      // Run MongoDB benchmark
      const mongoResults = await runBenchmark(
        () => mongo[operation](),
        [],
        iterations
      );
      
      // Run PostgreSQL benchmark
      const pgResults = await runBenchmark(
        () => postgres[pgOperation](),
        [],
        iterations
      );
      
      // Save results
      printResults(\`\${formatOperationName(operation)} Benchmark\`, mongoResults, pgResults);
      results[operation].mongodb = mongoResults;
      results[operation].postgresql = pgResults;
      results[operation].comparison = compareResults(mongoResults, pgResults);
    }
    
    return results;
  } catch (error) {
    console.error('Error running ${benchmarkName} benchmark:', error);
    throw error;
  }
}

/**
 * Format benchmark name for display
 * @param {string} name - Benchmark name
 * @returns {string} - Formatted name
 */
function formatBenchmarkName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format operation name for display
 * @param {string} name - Operation name
 * @returns {string} - Formatted name
 */
function formatOperationName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/Aggregate$/, '')
    .replace(/Join$/, '')
    .trim();
}

module.exports = {
  setup,
  cleanup,
  run
};`;
}

/**
 * Format benchmark name for display
 * @param {string} name - Benchmark name
 * @returns {string} - Formatted name
 */
function formatBenchmarkName(name) {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Fix all benchmark modules
 * @returns {Promise<void>}
 */
async function fixAllBenchmarkModules() {
  console.log(chalk.blue('Fixing all benchmark modules...'));
  
  try {
    // Get all benchmark directories
    const benchmarksDir = path.join(process.cwd(), 'src', 'benchmarks');
    const entries = await fs.readdir(benchmarksDir, { withFileTypes: true });
    
    // Filter directories
    const benchmarks = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    console.log(chalk.blue(`Found benchmarks: ${benchmarks.join(', ')}`));
    
    // Fix each benchmark
    for (const benchmark of benchmarks) {
      await fixBenchmarkModule(benchmark);
    }
    
    console.log(chalk.green('All benchmark modules fixed successfully'));
  } catch (error) {
    console.error(chalk.red('Error fixing benchmark modules:'), error);
  }
}

// Run the fixer if this file is executed directly
if (require.main === module) {
  fixAllBenchmarkModules().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  fixBenchmarkModule,
  fixAllBenchmarkModules
}; 