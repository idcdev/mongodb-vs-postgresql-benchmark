/**
 * Tests for SingleDocumentQueryBenchmark
 * 
 * This file contains tests for the benchmark that measures performance of
 * querying individual documents in MongoDB and PostgreSQL.
 */

import { SingleDocumentQueryBenchmark } from './single-document-query.benchmark';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';
import { BenchmarkOptions } from '../../../domain/model/benchmark-options';
import { jest } from '@jest/globals';

// Mock for DatabaseAdapter
const createMockAdapter = (): jest.Mocked<DatabaseAdapter> => {
  const mockAdapter: Partial<DatabaseAdapter> = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    executeRawQuery: jest.fn().mockResolvedValue({}),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id-123' }),
    findOne: jest.fn().mockResolvedValue({ id: 'mock-id-123', username: 'testuser' }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    createCollection: jest.fn().mockResolvedValue(true),
    dropCollection: jest.fn().mockResolvedValue(true),
    collectionExists: jest.fn().mockResolvedValue(false),
    objectId: jest.fn().mockImplementation(id => id),
    getDatabaseType: jest.fn().mockReturnValue(DatabaseType.MONGODB)
  };
  
  return mockAdapter as jest.Mocked<DatabaseAdapter>;
};

describe('SingleDocumentQueryBenchmark', () => {
  let benchmark: SingleDocumentQueryBenchmark;
  let mockMongoAdapter: jest.Mocked<DatabaseAdapter>;
  let mockPgAdapter: jest.Mocked<DatabaseAdapter>;
  let defaultOptions: BenchmarkOptions;
  
  beforeEach(() => {
    // Create a fresh benchmark and mock adapters for each test
    benchmark = new SingleDocumentQueryBenchmark();
    
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
      expect(benchmark.getName()).toBe('single-document-query');
      expect(benchmark.getDescription()).toContain('individual documents');
    });
  });
  
  describe('setup', () => {
    it('should generate test data and insert documents', async () => {
      await benchmark.setup(defaultOptions);
      
      // Verify documents were generated
      const testDocuments = (benchmark as any).testDocuments;
      expect(testDocuments.length).toBeGreaterThan(0);
      
      // Verify that insertOne was called for both databases
      expect(mockMongoAdapter.createCollection).toHaveBeenCalled();
      expect(mockPgAdapter.createCollection).toHaveBeenCalled();
      expect(mockMongoAdapter.insertOne).toHaveBeenCalled();
      expect(mockPgAdapter.insertOne).toHaveBeenCalled();
      
      // Verify document IDs were collected
      const documentIds = (benchmark as any).documentIds;
      expect(documentIds.length).toBeGreaterThan(0);
    });
    
    it('should handle existing collections', async () => {
      mockMongoAdapter.collectionExists.mockResolvedValue(true);
      mockPgAdapter.collectionExists.mockResolvedValue(true);
      
      await benchmark.setup(defaultOptions);
      
      // Should delete existing data instead of creating collections
      expect(mockMongoAdapter.deleteMany).toHaveBeenCalled();
      expect(mockPgAdapter.deleteMany).toHaveBeenCalled();
      expect(mockMongoAdapter.createCollection).not.toHaveBeenCalled();
      expect(mockPgAdapter.createCollection).not.toHaveBeenCalled();
    });
    
    it('should handle insert errors gracefully', async () => {
      // Configure one of the inserts to fail
      mockMongoAdapter.insertOne.mockRejectedValueOnce(new Error('Mock insertion error'));
      
      await benchmark.setup(defaultOptions);
      
      // Verify other inserts still proceed
      expect(mockMongoAdapter.insertOne.mock.calls.length).toBeGreaterThan(1);
    });
  });
  
  describe('run', () => {
    beforeEach(async () => {
      // Initialize with some data
      await benchmark.setup(defaultOptions);
      
      // Override documentIds for testing
      (benchmark as any).documentIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
    });
    
    it('should run benchmark for MongoDB', async () => {
      // Setup to run only MongoDB tests
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      const result = await benchmark.run(defaultOptions);
      
      expect(result.mongodb).toBeDefined();
      expect(result.mongodb?.databaseType).toBe(DatabaseType.MONGODB);
      expect(result.mongodb?.durations.length).toBe(defaultOptions.iterations);
      expect(mockMongoAdapter.findOne).toHaveBeenCalled();
    });
    
    it('should run benchmark for PostgreSQL', async () => {
      // Setup to run only PostgreSQL tests
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.POSTGRESQL]);
      
      const result = await benchmark.run(defaultOptions);
      
      expect(result.postgresql).toBeDefined();
      expect(result.postgresql?.databaseType).toBe(DatabaseType.POSTGRESQL);
      expect(result.postgresql?.durations.length).toBe(defaultOptions.iterations);
      expect(mockPgAdapter.findOne).toHaveBeenCalled();
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
    
    it('should convert string IDs to ObjectId for MongoDB queries', async () => {
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      // Set a document ID that looks like a MongoDB ObjectId
      (benchmark as any).documentIds = ['507f1f77bcf86cd799439011', 'id2', 'id3'];
      
      await benchmark.run(defaultOptions);
      
      // Verify the objectId method was called
      expect(mockMongoAdapter.objectId).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });
    
    it('should track missing documents in metrics', async () => {
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      // Make some document queries fail
      let queryCount = 0;
      mockMongoAdapter.findOne.mockImplementation(() => {
        queryCount++;
        // Every third query returns null (document not found)
        if (queryCount % 3 === 0) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: `mock-id-${queryCount}`, username: 'testuser' });
      });
      
      const result = await benchmark.run(defaultOptions);
      
      const metrics = result.mongodb?.iterations[0];
      expect(metrics.missingDocuments).toBeGreaterThan(0);
      expect(metrics.documentsFound).toBeLessThan(metrics.queriesExecuted);
    });
    
    it('should handle query errors gracefully', async () => {
      jest.spyOn(benchmark as any, 'supportedDatabases', 'get').mockReturnValue([DatabaseType.MONGODB]);
      
      // Make one query fail with an error
      mockMongoAdapter.findOne.mockRejectedValueOnce(new Error('Mock query error'));
      
      const result = await benchmark.run(defaultOptions);
      
      // Should still complete and have metrics
      expect(result.mongodb).toBeDefined();
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
        age: 25,
        isActive: true,
        createdAt: new Date(),
        metadata: {
          lastLogin: new Date(),
          preferences: { theme: 'dark' }
        },
        tags: ['test', 'user']
      };
      
      const formatted = (benchmark as any).formatDocumentForDatabase(testDoc, DatabaseType.POSTGRESQL);
      
      expect(formatted.is_active).toBe(true);
      expect(formatted.created_at).toBeDefined();
      expect(typeof formatted.metadata).toBe('string');
      expect(JSON.parse(formatted.metadata).preferences.theme).toBe('dark');
    });
    
    it('should return MongoDB documents with shallow clone', async () => {
      const testDoc = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
        isActive: true,
        createdAt: new Date(),
        metadata: {
          lastLogin: new Date(),
          preferences: { theme: 'dark' }
        },
        tags: ['test', 'user']
      };
      
      const formatted = (benchmark as any).formatDocumentForDatabase(testDoc, DatabaseType.MONGODB);
      
      // Should be a shallow clone (not the same object reference)
      expect(formatted).not.toBe(testDoc);
      
      // But should have the same properties
      expect(formatted.username).toBe('testuser');
      expect(formatted.isActive).toBe(true);
      expect(formatted.metadata.preferences.theme).toBe('dark');
    });
  });
  
  describe('shuffleArray', () => {
    it('should shuffle array items', () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = (benchmark as any).shuffleArray(original);
      
      // Should have the same items but in different order
      expect(shuffled).not.toEqual(original);
      expect(shuffled.sort()).toEqual(original);
      
      // Original should not be modified
      expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
    
    it('should return a new array', () => {
      const original = [1, 2, 3];
      const shuffled = (benchmark as any).shuffleArray(original);
      
      expect(shuffled).not.toBe(original);
    });
  });
}); 