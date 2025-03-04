/**
 * Tests for BatchInsertionBenchmark
 */

import { BatchInsertionBenchmark } from './batch-insertion.benchmark';
import { BenchmarkOptions, DataSize } from '../../../domain/model/benchmark-options';
import { DatabaseAdapter, DatabaseType } from '../../../domain/interfaces/database-adapter.interface';

// Mock the DatabaseAdapter
const createMockAdapter = () => {
  const mockAdapter: jest.Mocked<DatabaseAdapter> = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    createCollection: jest.fn().mockResolvedValue(true),
    collectionExists: jest.fn().mockResolvedValue(false),
    dropCollection: jest.fn().mockResolvedValue(true),
    insertOne: jest.fn().mockImplementation(() => Promise.resolve({ id: '123' })),
    insertMany: jest.fn().mockImplementation((collection, docs) => Promise.resolve(
      docs.map((_, index) => ({ id: `batch-${index}` }))
    )),
    find: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    count: jest.fn(),
    executeRawQuery: jest.fn(),
    getDatabaseType: jest.fn().mockReturnValue(DatabaseType.MONGODB),
    getConnectionOptions: jest.fn().mockReturnValue({})
  };
  
  return mockAdapter;
};

describe('BatchInsertionBenchmark', () => {
  let benchmark: BatchInsertionBenchmark;
  let mockMongoAdapter: jest.Mocked<DatabaseAdapter>;
  let mockPostgresAdapter: jest.Mocked<DatabaseAdapter>;
  
  beforeEach(() => {
    // Create a new benchmark instance before each test
    benchmark = new BatchInsertionBenchmark();
    
    // Create mock adapters
    mockMongoAdapter = createMockAdapter();
    mockMongoAdapter.getDatabaseType.mockReturnValue(DatabaseType.MONGODB);
    
    mockPostgresAdapter = createMockAdapter();
    mockPostgresAdapter.getDatabaseType.mockReturnValue(DatabaseType.POSTGRESQL);
    
    // Override the getAdapter method to return our mock adapters
    jest.spyOn(benchmark as any, 'getAdapter').mockImplementation((dbType: DatabaseType) => {
      return dbType === DatabaseType.MONGODB ? mockMongoAdapter : mockPostgresAdapter;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('constructor', () => {
    it('should set the correct name and description', () => {
      expect(benchmark.getName()).toBe('batch-insertion');
      expect(benchmark.getDescription()).toContain('inserting multiple documents');
    });
  });
  
  describe('setup', () => {
    it('should generate test data based on specified size', async () => {
      const options: BenchmarkOptions = {
        size: DataSize.SMALL,
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
    
    it('should respect custom batch sizes when provided', async () => {
      const options: BenchmarkOptions = {
        size: DataSize.CUSTOM,
        customSize: 50,
        iterations: 3,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false,
        batchSizes: [5, 25, 50]
      };
      
      await benchmark.setup(options);
      
      // Verify batch sizes were updated
      const batchSizes = (benchmark as any).batchSizes;
      expect(batchSizes).toEqual([5, 25, 50]);
    });
  });
  
  describe('run', () => {
    it('should execute benchmark for MongoDB with multiple batch sizes', async () => {
      // Configure benchmark to only test MongoDB
      jest.spyOn(benchmark, 'getSupportedDatabases').mockReturnValue([DatabaseType.MONGODB]);
      
      // Override batch sizes for faster testing
      (benchmark as any).batchSizes = [5, 10];
      
      const options: BenchmarkOptions = {
        size: DataSize.CUSTOM,
        customSize: 20, // Small size for faster test
        iterations: 2,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      await benchmark.setup(options);
      const result = await benchmark.run(options);
      
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.name).toBe('batch-insertion');
      expect(result.mongodb).toBeDefined();
      expect(result.mongodb!.databaseType).toBe(DatabaseType.MONGODB);
      expect(result.mongodb!.durations.length).toBe(2); // 2 iterations
      expect(result.mongodb!.statistics).toBeDefined();
      expect(result.mongodb!.statistics.meanDurationMs).toBeGreaterThanOrEqual(0);
      
      // Verify MongoDB adapter was called correctly
      expect(mockMongoAdapter.connect).toHaveBeenCalled();
      expect(mockMongoAdapter.createCollection).toHaveBeenCalled();
      
      // Should have called insertMany for each batch size in each iteration
      // With these numbers: 2 iterations * 2 batch sizes = 4 total calls
      // Each iteration first tests batch size 5, then batch size 10
      expect(mockMongoAdapter.insertMany).toHaveBeenCalled();
      
      // Should have been called to clear the collection between batches
      expect(mockMongoAdapter.deleteMany).toHaveBeenCalled();
      
      expect(mockMongoAdapter.disconnect).toHaveBeenCalled();
    });
    
    it('should generate comparison when both databases are tested', async () => {
      // Make test faster with smaller data set and batch sizes
      (benchmark as any).batchSizes = [5, 10];
      
      const options: BenchmarkOptions = {
        size: DataSize.CUSTOM,
        customSize: 10,
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
        size: DataSize.CUSTOM,
        customSize: 5,
        iterations: 1,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false
      };
      
      // Mock that collections exist for this test
      mockMongoAdapter.collectionExists.mockResolvedValue(true);
      mockPostgresAdapter.collectionExists.mockResolvedValue(true);
      
      await benchmark.cleanup(options);
      
      // Verify collections were dropped
      expect(mockMongoAdapter.connect).toHaveBeenCalled();
      expect(mockMongoAdapter.dropCollection).toHaveBeenCalled();
      expect(mockMongoAdapter.disconnect).toHaveBeenCalled();
      
      expect(mockPostgresAdapter.connect).toHaveBeenCalled();
      expect(mockPostgresAdapter.dropCollection).toHaveBeenCalled();
      expect(mockPostgresAdapter.disconnect).toHaveBeenCalled();
    });
    
    it('should not drop collections if cleanupEnvironment is false', async () => {
      const options: BenchmarkOptions = {
        size: DataSize.CUSTOM,
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
      expect(mockPostgresAdapter.connect).not.toHaveBeenCalled();
      expect(mockPostgresAdapter.dropCollection).not.toHaveBeenCalled();
    });
  });
}); 