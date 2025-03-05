/**
 * Tests for SingleDocumentInsertionBenchmark
 * 
 * This file contains tests for the benchmark that measures performance of
 * inserting individual documents in MongoDB and PostgreSQL.
 */

import { SingleDocumentInsertionBenchmark } from './single-document-insertion.benchmark';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';
import { BenchmarkOptions } from '../../../domain/model/benchmark-options';
import { jest } from '@jest/globals';

// Mock for DatabaseAdapter
const createMockAdapter = (): Partial<DatabaseAdapter> => {
  return {
    getType: jest.fn().mockReturnValue(DatabaseType.MONGODB),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    executeRawQuery: jest.fn().mockResolvedValue({}),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id-123' }),
    deleteMany: jest.fn().mockResolvedValue(5),
    createCollection: jest.fn().mockResolvedValue(undefined),
    dropCollection: jest.fn().mockResolvedValue(true),
    collectionExists: jest.fn().mockResolvedValue(false),
    objectId: jest.fn().mockImplementation((id: string) => id),
    isConnected: jest.fn().mockReturnValue(true)
  };
};

describe('SingleDocumentInsertionBenchmark', () => {
  let benchmark: SingleDocumentInsertionBenchmark;
  let mockMongoAdapter: jest.Mocked<DatabaseAdapter>;
  let mockPgAdapter: jest.Mocked<DatabaseAdapter>;
  let defaultOptions: BenchmarkOptions;
  
  beforeEach(() => {
    // Create a fresh benchmark and mock adapters for each test
    benchmark = new SingleDocumentInsertionBenchmark();
    
    // Setup mock adapters
    mockMongoAdapter = createMockAdapter() as jest.Mocked<DatabaseAdapter>;
    (mockMongoAdapter.getType as jest.Mock).mockReturnValue(DatabaseType.MONGODB);
    
    mockPgAdapter = createMockAdapter() as jest.Mocked<DatabaseAdapter>;
    (mockPgAdapter.getType as jest.Mock).mockReturnValue(DatabaseType.POSTGRESQL);
    
    // Mock getAdapter method to return our mock adapters
    jest.spyOn(benchmark as any, 'getAdapter').mockImplementation(function(dbType: any) {
      return dbType === DatabaseType.MONGODB ? mockMongoAdapter : mockPgAdapter;
    });
    
    // Default options for tests
    defaultOptions = {
      size: 'small',
      iterations: 2,
      setupEnvironment: true,
      cleanupEnvironment: true,
      saveResults: false,
      verbose: false
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with correct name and description', () => {
      expect(benchmark.getName()).toBe('single-document-insertion');
      expect(benchmark.getDescription()).toContain('individual documents');
    });
  });
  
  describe('setup', () => {
    it('should generate test data based on specified size', async () => {
      const options: BenchmarkOptions = {
        size: 'small',
        iterations: 3,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      await benchmark.setup(options);
      
      // Verify testData was generated (access private field for testing)
      const testData = (benchmark as any).testData;
      expect(testData).toBeDefined();
      expect(Array.isArray(testData)).toBe(true);
      expect(testData.length).toBe(1000); // SMALL is 1000 by default
    });
    
    it('should respect custom size when specified', async () => {
      const options: BenchmarkOptions = {
        size: 'custom',
        customSize: 50,
        iterations: 3,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      await benchmark.setup(options);
      
      const testData = (benchmark as any).testData;
      expect(testData.length).toBe(50);
    });
  });
  
  describe('run', () => {
    it('should execute benchmark for MongoDB and return valid results', async () => {
      // Configure benchmark to only test MongoDB
      jest.spyOn(benchmark, 'getSupportedDatabases').mockReturnValue([DatabaseType.MONGODB]);
      
      const options: BenchmarkOptions = {
        size: 'custom',
        customSize: 10, // Small size for faster test
        iterations: 2,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      await benchmark.setup(options);
      const result = await benchmark.run(options);
      
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.name).toBe('single-document-insertion');
      expect(result.mongodb).toBeDefined();
      expect(result.mongodb!.databaseType).toBe(DatabaseType.MONGODB);
      expect(result.mongodb!.durations.length).toBe(2); // 2 iterations
      expect(result.mongodb!.statistics).toBeDefined();
      expect(result.mongodb!.statistics.meanDurationMs).toBeGreaterThanOrEqual(0);
      
      // Verify MongoDB adapter was called correctly
      expect(mockMongoAdapter.connect).toHaveBeenCalled();
      expect(mockMongoAdapter.createCollection).toHaveBeenCalled();
      expect(mockMongoAdapter.insertOne).toHaveBeenCalledTimes(20); // 10 docs × 2 iterations
      expect(mockMongoAdapter.disconnect).toHaveBeenCalled();
    });
    
    it('should generate comparison when both databases are tested', async () => {
      const options: BenchmarkOptions = {
        size: 'custom',
        customSize: 5, // Very small for faster test
        iterations: 1,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      await benchmark.setup(options);
      const result = await benchmark.run(options);
      
      // Verify comparison was generated
      expect(result.comparison).toBeDefined();
      expect(result.comparison!.medianRatio).toBeDefined();
      expect(result.comparison!.percentageDiff).toBeDefined();
      expect(result.comparison!.winner).toBeDefined();
    });
  });
  
  describe('cleanup', () => {
    it('should drop collections if cleanupEnvironment is true', async () => {
      const options: BenchmarkOptions = {
        size: 'custom',
        customSize: 5,
        iterations: 1,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      // Mock that collections exist for this test
      mockMongoAdapter.collectionExists.mockResolvedValue(true);
      mockPgAdapter.collectionExists.mockResolvedValue(true);
      
      await benchmark.cleanup(options);
      
      // Verify collections were dropped
      expect(mockMongoAdapter.connect).toHaveBeenCalled();
      expect(mockMongoAdapter.dropCollection).toHaveBeenCalled();
      expect(mockMongoAdapter.disconnect).toHaveBeenCalled();
      
      expect(mockPgAdapter.connect).toHaveBeenCalled();
      expect(mockPgAdapter.dropCollection).toHaveBeenCalled();
      expect(mockPgAdapter.disconnect).toHaveBeenCalled();
    });
    
    it('should not drop collections if cleanupEnvironment is false', async () => {
      const options: BenchmarkOptions = {
        size: 'custom',
        customSize: 5,
        iterations: 1,
        setupEnvironment: true,
        cleanupEnvironment: false, // Skip cleanup
        saveResults: false
      };
      
      await benchmark.cleanup(options);
      
      // Verify no collections were dropped
      expect(mockMongoAdapter.connect).not.toHaveBeenCalled();
      expect(mockMongoAdapter.dropCollection).not.toHaveBeenCalled();
      expect(mockPgAdapter.connect).not.toHaveBeenCalled();
      expect(mockPgAdapter.dropCollection).not.toHaveBeenCalled();
    });
  });
}); 