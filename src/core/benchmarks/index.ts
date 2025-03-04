/**
 * Benchmarks Entry Point
 * 
 * This file initializes all available benchmarks and provides a utility
 * to register them with the BenchmarkService.
 */

import { BenchmarkService } from '../domain/interfaces/benchmark-service.interface';
import * as CreateBenchmarks from './operations/create';
import * as ReadBenchmarks from './operations/read';

/**
 * Available benchmarks
 */
export const benchmarks = {
  singleDocumentInsertion: new CreateBenchmarks.SingleDocumentInsertionBenchmark(),
  batchInsertion: new CreateBenchmarks.BatchInsertionBenchmark(),
  validatedInsertion: new CreateBenchmarks.ValidatedInsertionBenchmark(),
  singleDocumentQuery: new ReadBenchmarks.SingleDocumentQueryBenchmark()
};

/**
 * Register all benchmarks with the provided service
 * 
 * @param service - The benchmark service
 * @returns true if all registrations were successful, false otherwise
 */
export function registerAllBenchmarks(service: BenchmarkService): boolean {
  let allSuccessful = true;
  
  Object.values(benchmarks).forEach(benchmark => {
    const success = service.registerBenchmark(benchmark);
    if (!success) {
      console.error(`Failed to register benchmark: ${benchmark.getName()}`);
      allSuccessful = false;
    }
  });
  
  return allSuccessful;
}

/**
 * Get benchmark by name
 * 
 * @param name - The name of the benchmark
 * @returns The benchmark instance or undefined if not found
 */
export function getBenchmarkByName(name: string) {
  const foundKey = Object.keys(benchmarks).find(key => 
    benchmarks[key as keyof typeof benchmarks].getName() === name
  );
  
  return foundKey ? benchmarks[foundKey as keyof typeof benchmarks] : undefined;
}

// Export all operation benchmarks
export * from './operations';

// Future benchmark categories will be exported here:
// export * from './complex-queries';
// export * from './transactions';
// export * from './aggregations';
// export * from './indexing'; 