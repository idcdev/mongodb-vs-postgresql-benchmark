/**
 * Single Document Insertion Benchmark
 * 
 * This benchmark measures the performance of inserting individual documents/records
 * in MongoDB and PostgreSQL databases.
 */

import { BaseBenchmark } from '../../../domain/model/base-benchmark';
import { BenchmarkOptions, DataSize } from '../../../domain/model/benchmark-options';
import { BenchmarkResult, DatabaseBenchmarkResult } from '../../../domain/model/benchmark-result';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';

// Document structure for the benchmark
interface TestDocument {
  id?: string | number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  active: boolean;
  createdAt: Date;
}

/**
 * Benchmark for single document insertion operations
 */
export class SingleDocumentInsertionBenchmark extends BaseBenchmark {
  // Collection name for the benchmark
  private readonly collectionName = 'benchmark_users';
  
  // Test data for the benchmark
  private testDocuments: TestDocument[] = [];
  
  /**
   * Constructor
   */
  constructor() {
    super(
      'Single Document Insertion',
      'Measures the performance of inserting individual documents/records'
    );
  }
  
  /**
   * Setup the benchmark environment
   */
  public async setup(options: BenchmarkOptions): Promise<void> {
    // Generate test data based on the benchmark size
    const count = this.getDataSize(options.size, options.customSize);
    this.testDocuments = this.generateTestData(count);
    
    // Setup for MongoDB
    if (options.databaseOptions?.mongodb) {
      try {
        const mongoAdapter = await this.getAdapter(DatabaseType.MONGODB);
        await this.setupDatabase(mongoAdapter);
      } catch (error) {
        console.error('Error setting up MongoDB:', error);
      }
    }
    
    // Setup for PostgreSQL
    if (options.databaseOptions?.postgresql) {
      try {
        const postgresAdapter = await this.getAdapter(DatabaseType.POSTGRESQL);
        await this.setupDatabase(postgresAdapter);
      } catch (error) {
        console.error('Error setting up PostgreSQL:', error);
      }
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
      environment: this.getSystemInfo()
    };
    
    // Run for MongoDB if configured
    if (options.databaseOptions?.mongodb) {
      result.mongodb = await this.runForDatabase(DatabaseType.MONGODB, options);
    }
    
    // Run for PostgreSQL if configured
    if (options.databaseOptions?.postgresql) {
      result.postgresql = await this.runForDatabase(DatabaseType.POSTGRESQL, options);
    }
    
    // Generate comparison if both databases were benchmarked
    if (result.mongodb && result.postgresql) {
      this.generateComparison(result);
    }
    
    return result;
  }
  
  /**
   * Clean up the benchmark environment
   */
  public async cleanup(options: BenchmarkOptions): Promise<void> {
    // Clean up MongoDB
    if (options.databaseOptions?.mongodb) {
      try {
        const mongoAdapter = await this.getAdapter(DatabaseType.MONGODB);
        await this.cleanupDatabase(mongoAdapter);
      } catch (error) {
        console.error('Error cleaning up MongoDB:', error);
      }
    }
    
    // Clean up PostgreSQL
    if (options.databaseOptions?.postgresql) {
      try {
        const postgresAdapter = await this.getAdapter(DatabaseType.POSTGRESQL);
        await this.cleanupDatabase(postgresAdapter);
      } catch (error) {
        console.error('Error cleaning up PostgreSQL:', error);
      }
    }
    
    // Clear test data
    this.testDocuments = [];
  }
  
  /**
   * Run the benchmark for a specific database
   */
  private async runForDatabase(
    databaseType: DatabaseType,
    options: BenchmarkOptions
  ): Promise<DatabaseBenchmarkResult> {
    const adapter = await this.getAdapter(databaseType);
    
    // Ensure the adapter is connected
    if (!adapter.isConnected()) {
      await adapter.connect();
    }
    
    const iterations = options.iterations || 5;
    const durations: number[] = [];
    
    // Run the benchmark for the specified number of iterations
    for (let i = 0; i < iterations; i++) {
      const { durationMs } = await this.executeInsertion(
        adapter,
        databaseType,
        options
      );
      
      durations.push(durationMs);
    }
    
    // Calculate statistics
    const stats = this.calculateStatistics(durations);
    
    return {
      databaseType,
      operationCount: this.testDocuments.length * iterations,
      iterations: durations.map((duration, index) => ({
        iteration: index + 1,
        durationMs: duration
      })),
      totalDurationMs: durations.reduce((sum, duration) => sum + duration, 0),
      averageDurationMs: stats.mean,
      minDurationMs: stats.min,
      maxDurationMs: stats.max,
      medianDurationMs: stats.median,
      standardDeviation: stats.stdDev,
      operationsPerSecond: 1000 / stats.mean
    };
  }
  
  /**
   * Execute the insertion benchmark
   */
  private async executeInsertion(
    adapter: DatabaseAdapter,
    databaseType: DatabaseType,
    options: BenchmarkOptions
  ): Promise<{ durationMs: number }> {
    const startTime = Date.now();
    
    // Insert each document individually
    for (const doc of this.testDocuments) {
      const formattedDoc = this.formatDocumentForDatabase(doc, databaseType);
      await adapter.insertOne(this.collectionName, formattedDoc);
    }
    
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    
    return { durationMs };
  }
  
  /**
   * Format a document for the specific database
   */
  private formatDocumentForDatabase(
    doc: TestDocument,
    databaseType: DatabaseType
  ): Record<string, any> {
    // For MongoDB, we can use the document as is
    if (databaseType === DatabaseType.MONGODB) {
      return { ...doc };
    }
    
    // For PostgreSQL, we need to ensure dates are properly formatted
    if (databaseType === DatabaseType.POSTGRESQL) {
      return {
        ...doc,
        createdAt: doc.createdAt.toISOString()
      };
    }
    
    return doc;
  }
  
  /**
   * Generate test data for the benchmark
   */
  private generateTestData(count: number): TestDocument[] {
    const documents: TestDocument[] = [];
    
    for (let i = 0; i < count; i++) {
      documents.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        age: 20 + (i % 50), // Ages between 20 and 69
        active: i % 3 === 0, // 1/3 of users are active
        createdAt: new Date()
      });
    }
    
    return documents;
  }
  
  /**
   * Get the number of documents to use based on the benchmark size
   */
  private getDataSize(size: DataSize | string, customSize?: number): number {
    if (size === DataSize.CUSTOM && customSize) {
      return customSize;
    }
    
    switch (size) {
      case DataSize.SMALL:
        return 100;
      case DataSize.MEDIUM:
        return 1000;
      case DataSize.LARGE:
        return 10000;
      default:
        return 100; // Default to small
    }
  }
  
  /**
   * Setup the database for the benchmark
   */
  private async setupDatabase(adapter: DatabaseAdapter): Promise<void> {
    // Ensure the adapter is connected
    if (!adapter.isConnected()) {
      await adapter.connect();
    }
    
    // Drop the collection if it exists
    try {
      await adapter.dropCollection(this.collectionName);
    } catch (error) {
      // Collection might not exist yet
    }
    
    // Create the collection
    await adapter.createCollection(this.collectionName);
  }
  
  /**
   * Clean up the database after the benchmark
   */
  private async cleanupDatabase(adapter: DatabaseAdapter): Promise<void> {
    // Ensure the adapter is connected
    if (!adapter.isConnected()) {
      await adapter.connect();
    }
    
    // Drop the collection
    try {
      await adapter.dropCollection(this.collectionName);
    } catch (error) {
      // Collection might not exist
    }
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
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median,
      stdDev
    };
  }
  
  /**
   * Get system information for the benchmark environment
   */
  private getSystemInfo(): any {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCount: require('os').cpus().length,
      memoryTotal: Math.round(require('os').totalmem() / (1024 * 1024 * 1024)) + 'GB',
      memoryFree: Math.round(require('os').freemem() / (1024 * 1024 * 1024)) + 'GB'
    };
  }
  
  /**
   * Generate comparison between MongoDB and PostgreSQL results
   */
  private generateComparison(result: BenchmarkResult): void {
    if (!result.mongodb || !result.postgresql) {
      return;
    }
    
    const mongoTime = result.mongodb.averageDurationMs;
    const postgresTime = result.postgresql.averageDurationMs;
    
    const fasterDb = mongoTime < postgresTime ? DatabaseType.MONGODB : DatabaseType.POSTGRESQL;
    const slowerDb = fasterDb === DatabaseType.MONGODB ? DatabaseType.POSTGRESQL : DatabaseType.MONGODB;
    const fasterTime = fasterDb === DatabaseType.MONGODB ? mongoTime : postgresTime;
    const slowerTime = slowerDb === DatabaseType.MONGODB ? mongoTime : postgresTime;
    
    const percentageDifference = ((slowerTime - fasterTime) / slowerTime) * 100;
    
    result.comparison = {
      faster: fasterDb,
      slower: slowerDb,
      percentFaster: percentageDifference,
      timeDifference: slowerTime - fasterTime
    };
  }
  
  /**
   * Get a database adapter
   */
  private async getAdapter(databaseType: DatabaseType): Promise<DatabaseAdapter> {
    // This will be implemented by the benchmark service in real usage
    throw new Error('Database adapter factory not implemented');
  }
  
  /**
   * Get default options for this benchmark
   */
  public getDefaultOptions(): BenchmarkOptions {
    return {
      size: DataSize.SMALL,
      iterations: 5,
      setupEnvironment: true,
      cleanupEnvironment: true,
      saveResults: true,
      outputDir: './benchmark-results',
      databaseOptions: {
        mongodb: {},
        postgresql: {}
      }
    };
  }
} 