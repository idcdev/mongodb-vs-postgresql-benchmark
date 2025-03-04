/**
 * Tests for SingleDocumentInsertionBenchmark
 */

import { SingleDocumentInsertionBenchmark } from './single-document-insertion.benchmark';
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
    insertMany: jest.fn(),
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

describe('SingleDocumentInsertionBenchmark', () => {
  let benchmark: SingleDocumentInsertionBenchmark;
  let mockMongoAdapter: jest.Mocked<DatabaseAdapter>;
  let mockPostgresAdapter: jest.Mocked<DatabaseAdapter>;
  
  beforeEach(() => {
    // Create a new benchmark instance before each test
    benchmark = new SingleDocumentInsertionBenchmark();
    
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
      expect(benchmark.getName()).toBe('single-document-insertion');
      expect(benchmark.getDescription()).toContain('inserting individual documents');
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
    
    it('should respect custom size when specified', async () => {
      const options: BenchmarkOptions = {
        size: DataSize.CUSTOM,
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
        size: DataSize.CUSTOM,
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
        size: DataSize.CUSTOM,
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