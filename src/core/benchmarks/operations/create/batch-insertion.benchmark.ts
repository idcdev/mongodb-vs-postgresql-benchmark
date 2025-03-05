/**
 * Batch Insertion Benchmark
 * 
 * This benchmark measures the performance of inserting multiple documents/records
 * in batches into MongoDB and PostgreSQL databases.
 */

import { BaseBenchmark } from '../../../domain/model/base-benchmark';
import { BenchmarkOptions, DataSize } from '../../../domain/model/benchmark-options';
import { BenchmarkResult, DatabaseBenchmarkResult, EnvironmentInfo } from '../../../domain/model/benchmark-result';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';

// Simple user document/record structure for the benchmark
interface User {
  id?: string | number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  active: boolean;
  createdAt: Date;
  profile?: {
    bio: string;
    avatarUrl: string;
    preferences: Record<string, any>;
  };
  tags: string[];
}

/**
 * Benchmark for batch document/record insertion
 */
export class BatchInsertionBenchmark extends BaseBenchmark {
  // Collection/table name to use for testing
  private readonly collectionName = 'benchmark_users';
  
  // Generated test data
  private testData: User[] = [];
  
  // Batch sizes to test
  private readonly batchSizes: number[] = [10, 100, 1000];
  
  /**
   * Constructor
   */
  constructor() {
    super(
      'batch-insertion',
      'Measures the performance of inserting multiple documents/records in batches'
    );
  }
  
  /**
   * Setup the benchmark environment
   * Creates the necessary collection/table and prepares test data
   */
  public async setup(options: BenchmarkOptions): Promise<void> {
    const dataSize = this.getDataSize(options.size, options.customSize);
    
    // Generate test data
    this.testData = this.generateTestData(dataSize);
    
    // Override batch sizes if provided in options
    if (options.batchSizes && Array.isArray(options.batchSizes) && options.batchSizes.length > 0) {
      this.batchSizes = options.batchSizes;
    }
    
    if (options.verbose) {
      console.log(`Generated ${dataSize} test documents for batch insertion benchmark`);
      console.log(`Using batch sizes: ${this.batchSizes.join(', ')}`);
    }
  }
  
  /**
   * Run the benchmark
   */
  public async run(options: BenchmarkOptions): Promise<BenchmarkResult> {
    const result: BenchmarkResult = {
      name: this.getName(),
      description: this.getDescription(),
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo()
    };
    
    // Run for each supported database adapter
    for (const dbType of this.supportedDatabases) {
      if (options.verbose) {
        console.log(`Running batch insertion benchmark for ${dbType}...`);
      }
      
      const dbResult = await this.runForDatabase(dbType, options);
      if (dbType === DatabaseType.MONGODB) {
        result.mongodb = dbResult;
      } else if (dbType === DatabaseType.POSTGRESQL) {
        result.postgresql = dbResult;
      }
    }
    
    // Generate comparison if both databases were tested
    if (result.mongodb && result.postgresql) {
      const { meanDurationMs: mongoMean, medianDurationMs: mongoMedian } = result.mongodb.statistics;
      const { meanDurationMs: pgMean, medianDurationMs: pgMedian } = result.postgresql.statistics;
      
      const medianRatio = pgMedian / mongoMedian;
      const percentageDiff = ((pgMedian - mongoMedian) / mongoMedian) * 100;
      
      result.comparison = {
        meanDiffMs: pgMean - mongoMean,
        medianDiffMs: pgMedian - mongoMedian,
        medianRatio,
        percentageDiff,
        winner: percentageDiff > 0 ? DatabaseType.MONGODB : DatabaseType.POSTGRESQL
      };
    }
    
    return result;
  }
  
  /**
   * Clean up the benchmark environment
   * Removes test collections/tables
   */
  public async cleanup(options: BenchmarkOptions): Promise<void> {
    if (!options.cleanupEnvironment) {
      return;
    }
    
    // Clean up collections/tables in each database
    for (const dbType of this.supportedDatabases) {
      try {
        const adapter = await this.getAdapter(dbType);
        await adapter.connect();
        
        if (await adapter.collectionExists(this.collectionName)) {
          await adapter.dropCollection(this.collectionName);
          
          if (options.verbose) {
            console.log(`Dropped collection/table ${this.collectionName} in ${dbType}`);
          }
        }
        
        await adapter.disconnect();
      } catch (error) {
        console.error(`Error cleaning up ${dbType} environment:`, error);
      }
    }
  }
  
  /**
   * Run the benchmark for a specific database
   */
  private async runForDatabase(
    databaseType: DatabaseType,
    options: BenchmarkOptions
  ): Promise<DatabaseBenchmarkResult> {
    const adapter = await this.getAdapter(databaseType);
    await adapter.connect();
    
    // Create the collection/table if it doesn't exist
    if (!await adapter.collectionExists(this.collectionName)) {
      await adapter.createCollection(this.collectionName);
    }
    
    const iterations = options.iterations || 5;
    const durations: number[] = [];
    const metricsArray: any[] = [];
    
    // Run the benchmark multiple times
    for (let i = 0; i < iterations; i++) {
      if (options.verbose) {
        console.log(`Running iteration ${i + 1}/${iterations} for ${databaseType}...`);
      }
      
      // Reset database state for each iteration
      await adapter.deleteMany(this.collectionName, {});
      
      // Test each batch size and average the results
      let totalDuration = 0;
      const batchResults = [];
      
      for (const batchSize of this.batchSizes) {
        const result = await this.executeBatchInsertion(
          adapter, 
          batchSize,
          options
        );
        
        totalDuration += result.durationMs;
        batchResults.push({
          batchSize,
          ...result.metrics
        });
        
        // Clear data between batch size tests
        await adapter.deleteMany(this.collectionName, {});
      }
      
      // Average the durations across all batch sizes
      const avgDuration = totalDuration / this.batchSizes.length;
      durations.push(avgDuration);
      
      // Collect metrics
      metricsArray.push({
        durationMs: avgDuration,
        operationCount: this.testData.length,
        batchSizes: this.batchSizes,
        batchResults
      });
    }
    
    await adapter.disconnect();
    
    // Calculate statistics
    const statistics = this.calculateStatistics(durations);
    
    return {
      databaseType,
      durations,
      iterations: metricsArray,
      statistics,
      operation: {
        type: 'batch-insert',
        count: this.testData.length,
        metadata: {
          batchSizes: this.batchSizes
        }
      }
    };
  }
  
  /**
   * Execute batch document insertions
   */
  private async executeBatchInsertion(
    adapter: DatabaseAdapter,
    batchSize: number,
    options: BenchmarkOptions
  ): Promise<{ durationMs: number, metrics: any }> {
    const startTime = process.hrtime.bigint();
    let successCount = 0;
    let errorCount = 0;
    let batches = 0;
    
    try {
      // Split data into batches and insert
      for (let i = 0; i < this.testData.length; i += batchSize) {
        const batch = this.testData.slice(i, i + batchSize);
        batches++;
        
        try {
          await adapter.insertMany(this.collectionName, batch);
          successCount += batch.length;
        } catch (error) {
          errorCount += batch.length;
          if (options.verbose) {
            console.error(`Error inserting batch:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error during benchmark execution:`, error);
    }
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    const metrics = {
      durationMs,
      batchSize,
      batches,
      documentsInserted: successCount,
      documentsErrored: errorCount,
      throughput: (successCount / (durationMs / 1000)).toFixed(2), // Documents per second
      throughputBatches: (batches / (durationMs / 1000)).toFixed(2) // Batches per second
    };
    
    return { durationMs, metrics };
  }
  
  /**
   * Generate test data for the benchmark
   */
  private generateTestData(count: number): User[] {
    const users: User[] = [];
    
    for (let i = 0; i < count; i++) {
      users.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        age: 20 + (i % 50), // Ages between 20-69
        active: i % 5 !== 0, // 80% of users active
        createdAt: new Date(),
        profile: {
          bio: `This is the bio for user ${i}`,
          avatarUrl: `https://example.com/avatars/user${i}.jpg`,
          preferences: {
            theme: i % 2 === 0 ? 'light' : 'dark',
            notifications: i % 3 === 0,
            language: i % 4 === 0 ? 'en' : i % 4 === 1 ? 'es' : i % 4 === 2 ? 'fr' : 'de'
          }
        },
        tags: [
          `tag${i % 10}`,
          `category${i % 5}`,
          `group${i % 3}`
        ]
      });
    }
    
    return users;
  }
  
  /**
   * Calculate statistics from duration array
   */
  private calculateStatistics(durations: number[]): any {
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;
    
    // Calculate median
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
    
    // Calculate standard deviation
    const squaredDiffs = sorted.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calculate percentiles
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p99Index = Math.ceil(sorted.length * 0.99) - 1;
    
    return {
      minDurationMs: sorted[0],
      maxDurationMs: sorted[sorted.length - 1],
      meanDurationMs: mean,
      medianDurationMs: median,
      stdDevDurationMs: stdDev,
      p95DurationMs: sorted[p95Index],
      p99DurationMs: sorted[p99Index],
      coefficientOfVariation: stdDev / mean
    };
  }
  
  /**
   * Get a database adapter
   */
  private async getAdapter(databaseType: DatabaseType): Promise<DatabaseAdapter> {
    // In a real implementation, this would be provided by the BenchmarkService
    // For now, we'll try to get the adapter from the global adapters map in cli.ts
    const adapters = (global as any).adapters;
    
    if (adapters && adapters.get && adapters.get(databaseType)) {
      return adapters.get(databaseType);
    }
    
    throw new Error(`Database adapter for ${databaseType} not found. Make sure it's registered with the BenchmarkService.`);
  }
} 