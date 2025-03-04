/**
 * Validated Insertion Benchmark
 * 
 * This benchmark measures the performance of inserting documents/records
 * with validation rules in MongoDB and PostgreSQL databases.
 */

import { BaseBenchmark } from '../../../domain/model/base-benchmark';
import { BenchmarkOptions, DataSize } from '../../../domain/model/benchmark-options';
import { BenchmarkResult, DatabaseBenchmarkResult, EnvironmentInfo } from '../../../domain/model/benchmark-result';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';

// Schema for validation
interface UserSchema {
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

// MongoDB validation schema
const mongoValidationSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['username', 'email', 'firstName', 'lastName', 'age', 'active', 'createdAt', 'tags'],
    properties: {
      username: {
        bsonType: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: '^[a-zA-Z0-9_]+$'
      },
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      firstName: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 50
      },
      lastName: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 50
      },
      age: {
        bsonType: 'int',
        minimum: 18,
        maximum: 120
      },
      active: {
        bsonType: 'bool'
      },
      createdAt: {
        bsonType: 'date'
      },
      profile: {
        bsonType: 'object',
        properties: {
          bio: {
            bsonType: 'string',
            maxLength: 500
          },
          avatarUrl: {
            bsonType: 'string'
          },
          preferences: {
            bsonType: 'object'
          }
        }
      },
      tags: {
        bsonType: 'array',
        minItems: 1,
        items: {
          bsonType: 'string'
        }
      }
    }
  }
};

// PostgreSQL validation schema (simplified as SQL strings)
const postgresValidationSchema = {
  createTable: `
    CREATE TABLE IF NOT EXISTS benchmark_validated_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL CHECK (username ~ '^[a-zA-Z0-9_]+$'),
      email VARCHAR(100) NOT NULL CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      age INT NOT NULL CHECK (age BETWEEN 18 AND 120),
      active BOOLEAN NOT NULL,
      created_at TIMESTAMP NOT NULL,
      profile JSONB,
      tags TEXT[] NOT NULL CHECK (array_length(tags, 1) > 0)
    )
  `,
  createConstraints: `
    ALTER TABLE benchmark_validated_users
    ADD CONSTRAINT profile_check 
    CHECK (
      (profile IS NULL) OR 
      (jsonb_typeof(profile) = 'object' AND 
       (profile->>'bio' IS NULL OR length(profile->>'bio') <= 500))
    )
  `
};

/**
 * Benchmark for validated document/record insertion
 */
export class ValidatedInsertionBenchmark extends BaseBenchmark {
  // Collection/table name to use for testing
  private readonly collectionName = 'benchmark_validated_users';
  
  // Generated test data sets
  private validData: UserSchema[] = [];
  private invalidData: Partial<UserSchema>[] = [];
  
  // Percentage of invalid records to include
  private readonly invalidPercentage = 0.2; // 20% invalid records
  
  /**
   * Constructor
   */
  constructor() {
    super(
      'validated-insertion',
      'Measures the performance of inserting documents/records with validation rules'
    );
  }
  
  /**
   * Setup the benchmark environment
   * Creates the necessary collection/table with validation rules and prepares test data
   */
  public async setup(options: BenchmarkOptions): Promise<void> {
    const dataSize = this.getDataSize(options.size, options.customSize);
    
    // Override invalid percentage if provided
    if (typeof options.invalidPercentage === 'number') {
      this.invalidPercentage = Math.max(0, Math.min(1, options.invalidPercentage));
    }
    
    // Generate test data with both valid and invalid documents
    this.generateTestData(dataSize);
    
    if (options.verbose) {
      console.log(`Generated ${this.validData.length} valid and ${this.invalidData.length} invalid test documents`);
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
        console.log(`Running validated insertion benchmark for ${dbType}...`);
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
    
    // Create the collection/table with validation schema
    await this.createValidatedCollection(adapter, databaseType);
    
    const iterations = options.iterations || 5;
    const durations: number[] = [];
    const metricsArray: any[] = [];
    
    // Run the benchmark multiple times
    for (let i = 0; i < iterations; i++) {
      if (options.verbose) {
        console.log(`Running iteration ${i + 1}/${iterations} for ${databaseType}...`);
      }
      
      // Clear collection for each iteration
      await adapter.deleteMany(this.collectionName, {});
      
      // Execute benchmark and collect metrics
      const result = await this.executeValidatedInsertion(adapter, databaseType, options);
      
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
        type: 'validated-insert',
        count: this.validData.length + this.invalidData.length,
        metadata: {
          validCount: this.validData.length,
          invalidCount: this.invalidData.length,
          validPercentage: (this.validData.length / (this.validData.length + this.invalidData.length)) * 100,
          invalidPercentage: (this.invalidData.length / (this.validData.length + this.invalidData.length)) * 100
        }
      }
    };
  }
  
  /**
   * Create a collection/table with validation rules
   */
  private async createValidatedCollection(
    adapter: DatabaseAdapter,
    databaseType: DatabaseType
  ): Promise<void> {
    if (await adapter.collectionExists(this.collectionName)) {
      await adapter.dropCollection(this.collectionName);
    }
    
    if (databaseType === DatabaseType.MONGODB) {
      // Use MongoDB specific validation
      const createOptions = {
        validator: mongoValidationSchema
      };
      
      await adapter.createCollection(this.collectionName, createOptions);
    } else if (databaseType === DatabaseType.POSTGRESQL) {
      // For PostgreSQL, we need to execute raw SQL commands
      await adapter.executeRawQuery(postgresValidationSchema.createTable);
      await adapter.executeRawQuery(postgresValidationSchema.createConstraints);
    } else {
      // Default simple creation for other database types
      await adapter.createCollection(this.collectionName);
    }
  }
  
  /**
   * Execute insertion of both valid and invalid documents
   */
  private async executeValidatedInsertion(
    adapter: DatabaseAdapter,
    databaseType: DatabaseType,
    options: BenchmarkOptions
  ): Promise<{ durationMs: number, metrics: any }> {
    const startTime = process.hrtime.bigint();
    
    // Metrics to collect
    let validInserted = 0;
    let invalidRejected = 0;
    let invalidInserted = 0; // Should be 0 if validation works correctly
    let errors = 0;
    
    // Insert the valid documents (expected to succeed)
    try {
      for (const doc of this.validData) {
        try {
          await adapter.insertOne(this.collectionName, this.formatDocumentForDatabase(doc, databaseType));
          validInserted++;
        } catch (error) {
          errors++;
          if (options.verbose) {
            console.error('Unexpected error on valid document:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error during valid documents insertion:', error);
    }
    
    // Try to insert invalid documents (expected to fail with validation errors)
    try {
      for (const doc of this.invalidData) {
        try {
          await adapter.insertOne(this.collectionName, this.formatDocumentForDatabase(doc, databaseType));
          invalidInserted++; // This is unexpected - validation should reject
        } catch (error) {
          invalidRejected++; // This is expected
        }
      }
    } catch (error) {
      console.error('Error during invalid documents insertion:', error);
    }
    
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;
    
    const metrics = {
      durationMs,
      totalDocuments: this.validData.length + this.invalidData.length,
      validDocuments: this.validData.length,
      invalidDocuments: this.invalidData.length,
      validInserted,
      invalidRejected,
      invalidInserted,
      errors,
      validationEffectiveness: invalidRejected / this.invalidData.length,
      throughput: ((validInserted + invalidInserted + invalidRejected) / (durationMs / 1000)).toFixed(2)
    };
    
    return { durationMs, metrics };
  }
  
  /**
   * Format a document based on the target database
   * Different databases may require different document structures
   */
  private formatDocumentForDatabase(
    doc: Partial<UserSchema>,
    databaseType: DatabaseType
  ): Record<string, any> {
    if (databaseType === DatabaseType.POSTGRESQL) {
      // Convert document to PostgreSQL format (camel case to snake case)
      return {
        username: doc.username,
        email: doc.email,
        first_name: doc.firstName,
        last_name: doc.lastName,
        age: doc.age,
        active: doc.active,
        created_at: doc.createdAt,
        profile: doc.profile ? JSON.stringify(doc.profile) : null,
        tags: doc.tags || []
      };
    }
    
    // MongoDB can use the document as is
    return doc as Record<string, any>;
  }
  
  /**
   * Generate test data for the benchmark
   * Creates both valid and invalid data sets
   */
  private generateTestData(count: number): void {
    // Calculate how many valid vs invalid documents to create
    const validCount = Math.floor(count * (1 - this.invalidPercentage));
    const invalidCount = count - validCount;
    
    // Generate valid documents
    this.validData = Array.from({ length: validCount }, (_, i) => ({
      username: `valid_user${i}`,
      email: `valid_user${i}@example.com`,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      age: 20 + (i % 50), // Ages between 20-69
      active: true,
      createdAt: new Date(),
      profile: {
        bio: `This is the bio for valid user ${i}`,
        avatarUrl: `https://example.com/avatars/valid_user${i}.jpg`,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en'
        }
      },
      tags: [`tag${i % 10}`, `valid${i % 5}`]
    }));
    
    // Generate invalid documents with various validation errors
    this.invalidData = [];
    
    for (let i = 0; i < invalidCount; i++) {
      // Create different types of invalid documents
      const errorType = i % 5;
      
      switch (errorType) {
        case 0:
          // Invalid username (special characters)
          this.invalidData.push({
            username: `invalid-user${i}!@#`,
            email: `invalid_user${i}@example.com`,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 25,
            active: true,
            createdAt: new Date(),
            tags: ['invalid']
          });
          break;
          
        case 1:
          // Invalid email format
          this.invalidData.push({
            username: `invalid_user${i}`,
            email: `not_an_email_address${i}`,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 25,
            active: true,
            createdAt: new Date(),
            tags: ['invalid']
          });
          break;
          
        case 2:
          // Invalid age (below minimum)
          this.invalidData.push({
            username: `invalid_user${i}`,
            email: `invalid_user${i}@example.com`,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 15, // Below minimum age of 18
            active: true,
            createdAt: new Date(),
            tags: ['invalid']
          });
          break;
          
        case 3:
          // Missing required field
          this.invalidData.push({
            username: `invalid_user${i}`,
            // email is missing
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 25,
            active: true,
            createdAt: new Date(),
            tags: ['invalid']
          });
          break;
          
        case 4:
          // Invalid tags (empty array)
          this.invalidData.push({
            username: `invalid_user${i}`,
            email: `invalid_user${i}@example.com`,
            firstName: `First${i}`,
            lastName: `Last${i}`,
            age: 25,
            active: true,
            createdAt: new Date(),
            tags: [] // Empty array, violates minItems: 1
          });
          break;
      }
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