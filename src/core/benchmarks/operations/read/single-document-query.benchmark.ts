/**
 * Single Document Query Benchmark
 * 
 * This benchmark measures the performance of querying individual documents/records
 * from MongoDB and PostgreSQL databases by their primary key.
 */

import { BaseBenchmark } from '../../../domain/model/base-benchmark';
import { BenchmarkOptions, DataSize } from '../../../domain/model/benchmark-options';
import { BenchmarkResult, DatabaseBenchmarkResult } from '../../../domain/model/benchmark-result';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';

/**
 * Document structure for benchmark testing
 */
interface TestDocument {
  id?: string | number;
  username: string;
  email: string;
  age: number;
  isActive: boolean;
  createdAt: Date;
  metadata: {
    lastLogin: Date;
    preferences: Record<string, any>;
  };
  tags: string[];
}

/**
 * Benchmark for single document query performance
 */
export class SingleDocumentQueryBenchmark extends BaseBenchmark {
  // Collection/table name to use for testing
  private readonly collectionName = 'benchmark_users';
  
  // Test documents that will be inserted
  private testDocuments: TestDocument[] = [];
  
  // Document IDs for querying
  private documentIds: Array<string | number> = [];
  
  /**
   * Constructor
   */
  constructor() {
    super(
      'single-document-query',
      'Measures the performance of querying individual documents/records by primary key'
    );
  }
  
  /**
   * Setup the benchmark environment
   * Creates the necessary collection/table, generates and inserts test data
   */
  public async setup(options: BenchmarkOptions): Promise<void> {
    const dataSize = this.getDataSize(options.size, options.customSize);
    
    // Generate test documents
    this.generateTestData(dataSize);
    
    // Insert test data into each database
    for (const dbType of this.supportedDatabases) {
      if (options.verbose) {
        console.log(`Setting up ${dbType} for single document query benchmark...`);
      }
      
      const adapter = await this.getAdapter(dbType);
      await adapter.connect();
      
      // Create or clear collection
      if (await adapter.collectionExists(this.collectionName)) {
        await adapter.deleteMany(this.collectionName, {});
      } else {
        await adapter.createCollection(this.collectionName);
      }
      
      // Insert the test documents and save their IDs
      for (const doc of this.testDocuments) {
        try {
          const formattedDoc = this.formatDocumentForDatabase(doc, dbType);
          const result = await adapter.insertOne(this.collectionName, formattedDoc);
          
          if (this.documentIds.length < this.testDocuments.length) {
            // Add the ID to our list for querying later
            // MongoDB typically returns _id, PostgreSQL may use id
            const insertedId = result.insertedId || result.id;
            if (insertedId) {
              this.documentIds.push(insertedId);
            }
          }
        } catch (error) {
          if (options.verbose) {
            console.error(`Error inserting test document in ${dbType}:`, error);
          }
        }
      }
      
      if (options.verbose) {
        console.log(`Inserted ${this.testDocuments.length} documents in ${dbType} for querying`);
      }
      
      await adapter.disconnect();
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
        console.log(`Running single document query benchmark for ${dbType}...`);
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
    
    const iterations = options.iterations || 5;
    const durations: number[] = [];
    const metricsArray: any[] = [];
    
    // For MongoDB, we need to use ObjectId for the ID field if it's a string
    const documentIds = databaseType === DatabaseType.MONGODB
      ? this.documentIds.map(id => typeof id === 'string' && id.length === 24 
          ? adapter.objectId(id) 
          : id)
      : this.documentIds;
    
    // Run the benchmark multiple times
    for (let i = 0; i < iterations; i++) {
      if (options.verbose) {
        console.log(`Running iteration ${i + 1}/${iterations} for ${databaseType}...`);
      }
      
      // Execute query benchmark
      const result = await this.executeQueries(adapter, databaseType, documentIds, options);
      
      durations.push(result.durationMs);
      metricsArray.push(result.metrics);
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
        type: 'single-doc-query',
        count: this.documentIds.length,
        metadata: {
          missingDocuments: metricsArray.reduce((sum, m) => sum + m.missingDocuments, 0) / iterations,
          averageQueryTimeMs: metricsArray.reduce((sum, m) => sum + m.averageQueryTimeMs, 0) / iterations
        }
      }
    };
  }
  
  /**
   * Execute queries for all document IDs
   */
  private async executeQueries(
    adapter: DatabaseAdapter,
    databaseType: DatabaseType,
    documentIds: Array<string | number>,
    options: BenchmarkOptions
  ): Promise<{ durationMs: number, metrics: any }> {
    const startTime = process.hrtime.bigint();
    
    // Metrics to collect
    let queryCount = 0;
    let successCount = 0;
    let missingDocuments = 0;
    let individualQueryTimes: number[] = [];
    
    // Randomly shuffle IDs to simulate different access patterns
    const shuffledIds = this.shuffleArray([...documentIds]);
    
    // Query each document by ID
    for (const id of shuffledIds) {
      const queryStartTime = process.hrtime.bigint();
      
      try {
        // Construct the query based on database type
        const query = databaseType === DatabaseType.MONGODB
          ? { _id: id }
          : { id }; // PostgreSQL typically uses 'id'
        
        const result = await adapter.findOne(this.collectionName, query);
        queryCount++;
        
        if (result) {
          successCount++;
        } else {
          missingDocuments++;
          
          if (options.verbose) {
            console.log(`Document with ID ${id} not found in ${databaseType}`);
          }
        }
        
        const queryEndTime = process.hrtime.bigint();
        const queryDurationMs = Number(queryEndTime - queryStartTime) / 1_000_000;
        individualQueryTimes.push(queryDurationMs);
      } catch (error) {
        if (options.verbose) {
          console.error(`Error querying document with ID ${id} in ${databaseType}:`, error);
        }
      }
    }
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    // Calculate metrics
    const averageQueryTimeMs = individualQueryTimes.length > 0
      ? individualQueryTimes.reduce((sum, time) => sum + time, 0) / individualQueryTimes.length
      : 0;
    
    // Calculate percentiles for individual query times
    const sortedTimes = [...individualQueryTimes].sort((a, b) => a - b);
    const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
    const p99Index = Math.ceil(sortedTimes.length * 0.99) - 1;
    
    const metrics = {
      durationMs,
      totalDocuments: this.testDocuments.length,
      queriesExecuted: queryCount,
      documentsFound: successCount,
      missingDocuments,
      averageQueryTimeMs,
      minQueryTimeMs: sortedTimes[0] || 0,
      maxQueryTimeMs: sortedTimes[sortedTimes.length - 1] || 0,
      p95QueryTimeMs: sortedTimes[p95Index] || 0,
      p99QueryTimeMs: sortedTimes[p99Index] || 0,
      throughputQueriesPerSecond: (queryCount / (durationMs / 1000)).toFixed(2)
    };
    
    return { durationMs, metrics };
  }
  
  /**
   * Format a document based on the target database
   * Different databases may require different document structures
   */
  private formatDocumentForDatabase(
    doc: TestDocument,
    databaseType: DatabaseType
  ): Record<string, any> {
    if (databaseType === DatabaseType.POSTGRESQL) {
      // Convert document to PostgreSQL format (camel case to snake case)
      return {
        username: doc.username,
        email: doc.email,
        age: doc.age,
        is_active: doc.isActive,
        created_at: doc.createdAt,
        metadata: JSON.stringify(doc.metadata),
        tags: doc.tags
      };
    }
    
    // MongoDB can use the document as is
    return { ...doc };
  }
  
  /**
   * Generate test data for the benchmark
   */
  private generateTestData(count: number): void {
    this.testDocuments = [];
    
    for (let i = 0; i < count; i++) {
      this.testDocuments.push({
        username: `user${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 50), // Ages between 20-69
        isActive: i % 5 !== 0, // 80% active users
        createdAt: new Date(Date.now() - (i * 86400000)), // Different creation dates
        metadata: {
          lastLogin: new Date(Date.now() - (i * 3600000)),
          preferences: {
            theme: i % 2 === 0 ? 'light' : 'dark',
            language: ['en', 'fr', 'de', 'es', 'pt'][i % 5],
            notifications: i % 3 === 0
          }
        },
        tags: [
          `tag${i % 10}`,
          `category${i % 5}`,
          i % 2 === 0 ? 'premium' : 'standard'
        ]
      });
    }
  }
  
  /**
   * Randomly shuffle an array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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
   * Helper method to get database adapter
   * This is a mock implementation - in real usage, this would be injected
   */
  private async getAdapter(databaseType: DatabaseType): Promise<DatabaseAdapter> {
    // In the real implementation, this would be provided by the BenchmarkService
    // For now, throw an error as this is just a template
    throw new Error(`Database adapter for ${databaseType} should be provided by the BenchmarkService`);
  }
} 