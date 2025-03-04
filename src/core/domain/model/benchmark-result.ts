/**
 * Benchmark result model
 * 
 * This model defines the structure of benchmark execution results.
 */

import { DatabaseType } from '../interfaces/database-adapter.interface';

/**
 * Execution metrics for a single benchmark run
 */
export interface ExecutionMetrics {
  /**
   * Duration in milliseconds
   */
  durationMs: number;
  
  /**
   * Memory usage in bytes
   */
  memoryBytes?: number;
  
  /**
   * CPU usage percentage
   */
  cpuPercentage?: number;
  
  /**
   * Number of database operations performed
   */
  operationCount?: number;
  
  /**
   * Additional metrics specific to the benchmark
   */
  [key: string]: any;
}

/**
 * Statistical analysis of multiple benchmark iterations
 */
export interface StatisticalMetrics {
  /**
   * Minimum duration in milliseconds
   */
  minDurationMs: number;
  
  /**
   * Maximum duration in milliseconds
   */
  maxDurationMs: number;
  
  /**
   * Mean (average) duration in milliseconds
   */
  meanDurationMs: number;
  
  /**
   * Median duration in milliseconds
   */
  medianDurationMs: number;
  
  /**
   * Standard deviation of durations
   */
  stdDevDurationMs: number;
  
  /**
   * 95th percentile duration in milliseconds
   */
  p95DurationMs?: number;
  
  /**
   * 99th percentile duration in milliseconds
   */
  p99DurationMs?: number;
  
  /**
   * Coefficient of variation (stdDev / mean)
   */
  coefficientOfVariation?: number;
}

/**
 * Environment information for the benchmark
 */
export interface EnvironmentInfo {
  /**
   * Operating system information
   */
  os: {
    type: string;
    platform: string;
    release: string;
    architecture: string;
  };
  
  /**
   * Node.js information
   */
  nodejs: {
    version: string;
    memoryUsage: Record<string, number>;
  };
  
  /**
   * Database information
   */
  database: {
    type: string;
    version: string;
    connectionDetails?: Record<string, any>;
  };
  
  /**
   * Hardware information
   */
  hardware?: {
    cpu: string;
    cores: number;
    memory: number; // Total memory in bytes
  };
}

/**
 * Single database benchmark result
 */
export interface DatabaseBenchmarkResult {
  /**
   * Database type
   */
  databaseType: DatabaseType;
  
  /**
   * Array of durations for each iteration in milliseconds
   */
  durations: number[];
  
  /**
   * Execution metrics for each iteration
   */
  iterations: ExecutionMetrics[];
  
  /**
   * Statistical analysis of results
   */
  statistics: StatisticalMetrics;
  
  /**
   * Operation details
   */
  operation: {
    /**
     * Operation type (e.g., "single-insert", "batch-query")
     */
    type: string;
    
    /**
     * Operation count
     */
    count: number;
    
    /**
     * Additional operation metadata
     */
    metadata?: Record<string, any>;
  };
}

/**
 * Comparison between two database results
 */
export interface BenchmarkComparison {
  /**
   * Difference in mean duration (positive if second is slower)
   */
  meanDiffMs: number;
  
  /**
   * Difference in median duration (positive if second is slower)
   */
  medianDiffMs: number;
  
  /**
   * Ratio of median durations (second / first)
   * Values > 1 mean the second database is slower
   * Values < 1 mean the second database is faster
   */
  medianRatio: number;
  
  /**
   * Percentage difference between the databases
   * Positive values mean the second database is slower by that percentage
   * Negative values mean the second database is faster by that percentage
   */
  percentageDiff: number;
  
  /**
   * Which database performed better
   */
  winner: DatabaseType;
}

/**
 * Complete benchmark result
 */
export interface BenchmarkResult {
  /**
   * Name of the benchmark
   */
  name: string;
  
  /**
   * Description of the benchmark
   */
  description: string;
  
  /**
   * Timestamp when the benchmark was run
   */
  timestamp: string;
  
  /**
   * Environment information
   */
  environment: EnvironmentInfo;
  
  /**
   * Results for MongoDB
   */
  mongodb?: DatabaseBenchmarkResult;
  
  /**
   * Results for PostgreSQL
   */
  postgresql?: DatabaseBenchmarkResult;
  
  /**
   * Comparison between MongoDB and PostgreSQL, if both were tested
   */
  comparison?: BenchmarkComparison;
  
  /**
   * Additional results for other databases
   */
  [key: string]: any;
} 