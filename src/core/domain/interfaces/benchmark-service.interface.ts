/**
 * Benchmark Service Interface
 * 
 * This interface defines the contract for the benchmark service,
 * which is responsible for managing and executing benchmarks.
 */

import { Benchmark } from './benchmark.interface';
import { BenchmarkOptions } from '../model/benchmark-options';
import { BenchmarkResult } from '../model/benchmark-result';
import { DatabaseType } from './database-adapter.interface';

/**
 * Core benchmark service interface
 */
export interface BenchmarkService {
  /**
   * Register a benchmark with the service
   * 
   * @param benchmark - The benchmark to register
   * @returns true if registration was successful, false otherwise
   */
  registerBenchmark(benchmark: Benchmark): boolean;
  
  /**
   * Get a registered benchmark by name
   * 
   * @param name - The name of the benchmark
   * @returns The benchmark or null if not found
   */
  getBenchmark(name: string): Benchmark | null;
  
  /**
   * Get all registered benchmarks
   * 
   * @returns Array of registered benchmarks
   */
  getAllBenchmarks(): Benchmark[];
  
  /**
   * Run a specific benchmark
   * 
   * @param name - The name of the benchmark to run
   * @param options - The options for the benchmark
   * @returns The benchmark results
   */
  runBenchmark(name: string, options?: Partial<BenchmarkOptions>): Promise<BenchmarkResult>;
  
  /**
   * Run a specific benchmark with a specific database
   * 
   * @param name - The name of the benchmark to run
   * @param databaseType - The type of database to benchmark
   * @param options - The options for the benchmark
   * @returns The benchmark results
   */
  runBenchmarkWithDatabase(
    name: string,
    databaseType: DatabaseType,
    options?: Partial<BenchmarkOptions>
  ): Promise<BenchmarkResult>;
  
  /**
   * Run all registered benchmarks
   * 
   * @param options - The options for the benchmarks
   * @returns The benchmark results for all benchmarks
   */
  runAllBenchmarks(options?: Partial<BenchmarkOptions>): Promise<Record<string, BenchmarkResult>>;
  
  /**
   * Check if a benchmark is registered
   * 
   * @param name - The name of the benchmark
   * @returns true if the benchmark is registered, false otherwise
   */
  hasBenchmark(name: string): boolean;
  
  /**
   * Get the default options for benchmarks
   * 
   * @returns The default benchmark options
   */
  getDefaultOptions(): BenchmarkOptions;
  
  /**
   * Save benchmark results
   * 
   * @param name - The name of the benchmark
   * @param results - The benchmark results
   * @returns A promise that resolves when the results are saved
   */
  saveResults(name: string, results: BenchmarkResult): Promise<void>;
} 