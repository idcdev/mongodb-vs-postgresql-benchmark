/**
 * Benchmark interface
 * 
 * This interface defines the contract that all benchmarks must implement.
 * It provides a unified way to execute and manage different types of benchmarks.
 */

import { BenchmarkResult } from '../model/benchmark-result';
import { BenchmarkOptions } from '../model/benchmark-options';

/**
 * Core benchmark interface
 */
export interface Benchmark {
  /**
   * Get the name of the benchmark
   */
  getName(): string;
  
  /**
   * Get the description of the benchmark
   */
  getDescription(): string;
  
  /**
   * Setup the benchmark environment
   */
  setup(options: BenchmarkOptions): Promise<void>;
  
  /**
   * Run the benchmark
   */
  run(options: BenchmarkOptions): Promise<BenchmarkResult>;
  
  /**
   * Clean up the benchmark environment
   */
  cleanup(options: BenchmarkOptions): Promise<void>;
  
  /**
   * Get the supported database types for this benchmark
   */
  getSupportedDatabases(): string[];
  
  /**
   * Check if the benchmark supports a specific database type
   */
  supportsDatabase(databaseType: string): boolean;
  
  /**
   * Get the default options for this benchmark
   */
  getDefaultOptions(): BenchmarkOptions;
} 