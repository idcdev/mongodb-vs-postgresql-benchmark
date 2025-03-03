/**
 * Configuration Module
 * 
 * Central configuration for the MongoDB vs PostgreSQL benchmark project.
 * Loads environment variables and provides configuration for all benchmarks.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Default configuration
const config = {
  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/benchmark',
    database: process.env.MONGODB_DATABASE || 'benchmark',
    options: {
      // Removed deprecated options
    }
  },
  
  // PostgreSQL configuration
  postgresql: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE || 'benchmark',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.POSTGRES_SSL === 'true',
    connectionString: process.env.POSTGRES_CONNECTION_STRING || null
  },
  
  // Benchmark configuration
  benchmark: {
    // Default number of iterations for each benchmark
    iterations: parseInt(process.env.BENCHMARK_ITERATIONS || '5', 10),
    
    // Default data size (small, medium, large)
    dataSize: process.env.BENCHMARK_DATA_SIZE || 'small',
    
    // Output directory for benchmark results
    outputDir: process.env.BENCHMARK_OUTPUT_DIR || path.join(process.cwd(), 'results'),
    
    // Whether to save results to file
    saveResults: process.env.BENCHMARK_SAVE_RESULTS !== 'false',
    
    // Whether to print verbose output
    verbose: process.env.BENCHMARK_VERBOSE === 'true'
  },
  
  // Docker configuration
  docker: {
    // Whether to use Docker for database instances
    enabled: process.env.USE_DOCKER === 'true',
    
    // Docker Compose file path
    composeFile: process.env.DOCKER_COMPOSE_FILE || path.join(process.cwd(), 'docker-compose.yml'),
    
    // Docker network name
    network: process.env.DOCKER_NETWORK || 'benchmark-network'
  }
};

// Create results directory if it doesn't exist
if (config.benchmark.saveResults) {
  try {
    if (!fs.existsSync(config.benchmark.outputDir)) {
      fs.mkdirSync(config.benchmark.outputDir, { recursive: true });
    }
  } catch (error) {
    console.error(`Error creating results directory: ${error.message}`);
  }
}

// Load custom configuration if available
const customConfigPath = path.join(process.cwd(), 'benchmark.config.js');
if (fs.existsSync(customConfigPath)) {
  try {
    const customConfig = require(customConfigPath);
    
    // Deep merge custom configuration with default configuration
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
    
    merge(config, customConfig);
    
    console.log('Loaded custom configuration from benchmark.config.js');
  } catch (error) {
    console.error(`Error loading custom configuration: ${error.message}`);
  }
}

module.exports = config; 