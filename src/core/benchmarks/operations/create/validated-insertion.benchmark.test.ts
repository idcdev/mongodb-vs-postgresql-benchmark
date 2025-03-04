/**
 * Tests for ValidatedInsertionBenchmark
 * 
 * This file contains tests for the benchmark that measures performance of
 * inserting documents with validation rules in MongoDB and PostgreSQL.
 */

import { ValidatedInsertionBenchmark } from './validated-insertion.benchmark';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';
import { BenchmarkOptions } from '../../../domain/model/benchmark-options';
import { jest } from '@jest/globals';

// Mock for DatabaseAdapter
const createMockAdapter = (): jest.Mocked<DatabaseAdapter> => {
  const mockAdapter: Partial<DatabaseAdapter> = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    executeRawQuery: jest.fn().mockResolvedValue({}),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    createCollection: jest.fn().mockResolvedValue(true),
    dropCollection: jest.fn().mockResolvedValue(true),
    collectionExists: jest.fn().mockResolvedValue(false),
    getDatabaseType: jest.fn().mockReturnValue(DatabaseType.MONGODB)
  };
  
  return mockAdapter as jest.Mocked<DatabaseAdapter>;
};

describe('ValidatedInsertionBenchmark', () => {
  let benchmark: ValidatedInsertionBenchmark;
  let mockMongoAdapter: jest.Mocked<DatabaseAdapter>;
  let mockPgAdapter: jest.Mocked<DatabaseAdapter>;
  let defaultOptions: BenchmarkOptions;
  
  beforeEach(() => {
    // Create a fresh benchmark and mock adapters for each test
    benchmark = new ValidatedInsertionBenchmark();
    
    // Setup mock adapters
    mockMongoAdapter = createMockAdapter();
    mockMongoAdapter.getDatabaseType.mockReturnValue(DatabaseType.MONGODB);
    
    mockPgAdapter = createMockAdapter();
    mockPgAdapter.getDatabaseType.mockReturnValue(DatabaseType.POSTGRESQL);
    
    // Override getAdapter to return our mocks
    jest.spyOn(benchmark as any, 'getAdapter').mockImplementation((dbType: DatabaseType) => {
      return dbType === DatabaseType.MONGODB ? mockMongoAdapter : mockPgAdapter;
    });
    
    // Default options for tests
    defaultOptions = {
      size: 'small',
      iterations: 2,
      verbose: false,
      cleanupEnvironment: true
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with correct name and description', () => {
      expect(benchmark.getName()).toBe('validated-insertion');
      expect(benchmark.getDescription()).toContain('validation');
    });
  });
  
  describe('setup', () => {
    it('should generate test data with valid and invalid documents', async () => {
      await benchmark.setup(defaultOptions);
      
      // Access private fields using type assertion
      const validData = (benchmark as any).validData;
      const invalidData = (benchmark as any).invalidData;
      
      // Verify data was generated
      expect(validData.length).toBeGreaterThan(0);
      expect(invalidData.length).toBeGreaterThan(0);
      
      // Verify ratio of invalid data (default is 20%)
      const totalDocs = validData.length + invalidData.length;
      const invalidRatio = invalidData.length / totalDocs;
      expect(invalidRatio).toBeCloseTo(0.2, 1); // 0.2 with 1 decimal precision
    });
    
    it('should respect custom invalid percentage', async () => {
      const customOptions = {
        ...defaultOptions,
        invalidPercentage: 0.4 // 40% invalid
      };
      
      await benchmark.setup(customOptions);
      
      const validData = (benchmark as any).validData;
      const invalidData = (benchmark as any).invalidData;
      const totalDocs = validData.length + invalidData.length;
      const invalidRatio = invalidData.length / totalDocs;
      
      expect(invalidRatio).toBeCloseTo(0.4, 1);
    });
    
    it('should generate appropriate validation errors', async () => {
      await benchmark.setup(defaultOptions);
      
      const invalidData = (benchmark as any).invalidData;
      
      // Sample a few invalid documents and verify they have expected validation errors
      expect(invalidData.some(doc => doc.username && doc.username.includes('!@#'))).toBeTruthy();
      expect(invalidData.some(doc => doc.email && !doc.email.includes('@'))).toBeTruthy();
      expect(invalidData.some(doc => doc.age && doc.age < 18)).toBeTruthy();
      expect(invalidData.some(doc => !doc.email)).toBeTruthy();
      expect(invalidData.some(doc => doc.tags && doc.tags.length === 0)).toBeTruthy();
    });
  });
  
  describe('run', () => {
    beforeEach(async () => {
      await benchmark.setup(defaultOptions);
    });
    
    it('should run benchmark for MongoDB', async () => {
      // Setup to run only MongoDB tests
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      const result = await benchmark.run(defaultOptions);
      
      expect(result.mongodb).toBeDefined();
      expect(result.mongodb?.databaseType).toBe(DatabaseType.MONGODB);
      expect(result.mongodb?.durations.length).toBe(defaultOptions.iterations);
      expect(mockMongoAdapter.createCollection).toHaveBeenCalled();
      expect(mockMongoAdapter.insertOne).toHaveBeenCalled();
    });
    
    it('should run benchmark for PostgreSQL', async () => {
      // Setup to run only PostgreSQL tests
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.POSTGRESQL]);
      
      const result = await benchmark.run(defaultOptions);
      
      expect(result.postgresql).toBeDefined();
      expect(result.postgresql?.databaseType).toBe(DatabaseType.POSTGRESQL);
      expect(result.postgresql?.durations.length).toBe(defaultOptions.iterations);
      expect(mockPgAdapter.executeRawQuery).toHaveBeenCalled();
      expect(mockPgAdapter.insertOne).toHaveBeenCalled();
    });
    
    it('should generate comparison when both databases are tested', async () => {
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([
        DatabaseType.MONGODB,
        DatabaseType.POSTGRESQL
      ]);
      
      const result = await benchmark.run(defaultOptions);
      
      expect(result.mongodb).toBeDefined();
      expect(result.postgresql).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.comparison?.winner).toBeDefined();
    });
    
    it('should track validation effectiveness in metrics', async () => {
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      // Mock insertOne to reject for some documents
      let insertCount = 0;
      mockMongoAdapter.insertOne.mockImplementation(() => {
        // Simulate validation rejecting ~20% of documents
        if (insertCount++ % 5 === 0) {
          return Promise.reject(new Error('Validation error'));
        }
        return Promise.resolve({ insertedId: 'mock-id' });
      });
      
      const result = await benchmark.run(defaultOptions);
      
      const metrics = result.mongodb?.iterations[0];
      expect(metrics.validationEffectiveness).toBeDefined();
      expect(metrics.invalidRejected).toBeGreaterThan(0);
    });
  });
  
  describe('cleanup', () => {
    it('should drop collections when cleanupEnvironment is true', async () => {
      mockMongoAdapter.collectionExists.mockResolvedValue(true);
      mockPgAdapter.collectionExists.mockResolvedValue(true);
      
      await benchmark.cleanup(defaultOptions);
      
      expect(mockMongoAdapter.dropCollection).toHaveBeenCalled();
      expect(mockPgAdapter.dropCollection).toHaveBeenCalled();
    });
    
    it('should not drop collections when cleanupEnvironment is false', async () => {
      const options = { ...defaultOptions, cleanupEnvironment: false };
      
      await benchmark.cleanup(options);
      
      expect(mockMongoAdapter.dropCollection).not.toHaveBeenCalled();
      expect(mockPgAdapter.dropCollection).not.toHaveBeenCalled();
    });
  });
  
  describe('formatDocumentForDatabase', () => {
    it('should format documents for PostgreSQL properly', async () => {
      const testDoc = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        active: true,
        createdAt: new Date(),
        profile: { bio: 'Test bio', avatarUrl: 'test.jpg', preferences: { theme: 'dark' } },
        tags: ['test', 'user']
      };
      
      const formatted = (benchmark as any).formatDocumentForDatabase(testDoc, DatabaseType.POSTGRESQL);
      
      expect(formatted.first_name).toBe('Test');
      expect(formatted.last_name).toBe('User');
      expect(formatted.created_at).toBeDefined();
      expect(typeof formatted.profile).toBe('string');
      expect(JSON.parse(formatted.profile).bio).toBe('Test bio');
    });
    
    it('should return MongoDB documents unchanged', async () => {
      const testDoc = {
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        active: true,
        createdAt: new Date(),
        tags: ['test', 'user']
      };
      
      const formatted = (benchmark as any).formatDocumentForDatabase(testDoc, DatabaseType.MONGODB);
      
      expect(formatted).toBe(testDoc);
      expect(formatted.firstName).toBe('Test');
      expect(formatted.lastName).toBe('User');
    });
  });
}); 