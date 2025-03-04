/**
 * Default Benchmark Service Tests
 */

import { DefaultBenchmarkService } from './default-benchmark-service';
import { 
  Benchmark, 
  ConfigProvider, 
  EventEmitter, 
  DatabaseAdapter,
  DatabaseType
} from '../../domain/interfaces';
import { DataSize } from '../../domain/model/benchmark-options';

describe('DefaultBenchmarkService', () => {
  // Mock dependencies
  const mockConfig: ConfigProvider = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(),
    loadFile: jest.fn(),
    loadEnvironment: jest.fn(),
    reset: jest.fn(),
    validate: jest.fn(),
  };
  
  const mockEventEmitter: EventEmitter = {
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: jest.fn(),
    hasListeners: jest.fn(),
  };
  
  // Mock benchmark implementation
  const createMockBenchmark = (name: string): Benchmark => ({
    getName: jest.fn().mockReturnValue(name),
    getDescription: jest.fn().mockReturnValue(`${name} description`),
    setup: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockResolvedValue({
      name,
      description: `${name} description`,
      timestamp: new Date().toISOString(),
      environment: {
        os: { type: 'test', platform: 'test', release: 'test', architecture: 'test' },
        nodejs: { version: 'test', memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 } },
        database: { type: 'test', version: 'test' },
        hardware: { cpu: 'test', cores: 1, memory: 0 }
      },
      databaseType: DatabaseType.MONGODB,
      durations: [100, 110, 90],
      iterations: [
        { durationMs: 100, operationCount: 10 },
        { durationMs: 110, operationCount: 10 },
        { durationMs: 90, operationCount: 10 }
      ],
      statistics: {
        minDurationMs: 90,
        maxDurationMs: 110,
        meanDurationMs: 100,
        medianDurationMs: 100,
        stdDevDurationMs: 10,
        p95DurationMs: 110,
        p99DurationMs: 110
      },
      operation: {
        type: 'test',
        count: 30,
        metadata: {}
      }
    }),
    cleanup: jest.fn().mockResolvedValue(undefined),
    getSupportedDatabases: jest.fn().mockReturnValue(['mongodb', 'postgresql']),
    supportsDatabase: jest.fn().mockReturnValue(true),
    getDefaultOptions: jest.fn().mockReturnValue({
      size: DataSize.SMALL,
      iterations: 3,
      setupEnvironment: true,
      cleanupEnvironment: true,
      saveResults: false,
      databaseOptions: {}
    })
  });
  
  // Mock database adapter
  const createMockDatabaseAdapter = (type: DatabaseType): DatabaseAdapter => ({
    getType: jest.fn().mockReturnValue(type),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    createCollection: jest.fn().mockResolvedValue(undefined),
    dropCollection: jest.fn().mockResolvedValue(true),
    insertOne: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    insertMany: jest.fn().mockResolvedValue([{ _id: 'test-id' }]),
    find: jest.fn().mockResolvedValue([{ _id: 'test-id' }]),
    findOne: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    findById: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    updateOne: jest.fn().mockResolvedValue({ _id: 'test-id' }),
    updateMany: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue(true),
    deleteMany: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(1),
    executeRawQuery: jest.fn().mockResolvedValue({ result: 'success' })
  });
  
  let benchmarkService: DefaultBenchmarkService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config
    (mockConfig.get as jest.Mock).mockImplementation((key, defaultValue) => {
      if (key === 'benchmarks.defaultOptions') {
        return {
          size: DataSize.SMALL,
          iterations: 5,
          setupEnvironment: true,
          cleanupEnvironment: true,
          saveResults: false,
          outputDir: './benchmark-results',
          verbose: false,
          databaseOptions: {
            mongodb: {},
            postgresql: {}
          }
        };
      }
      
      return defaultValue;
    });
    
    // Create service
    benchmarkService = new DefaultBenchmarkService(mockConfig, mockEventEmitter);
  });
  
  describe('constructor', () => {
    it('should create a new instance with the provided config and event emitter', () => {
      expect(benchmarkService).toBeInstanceOf(DefaultBenchmarkService);
      expect(mockConfig.get).toHaveBeenCalledWith('benchmarks.defaultOptions', expect.anything());
    });
  });
  
  describe('registerDatabaseAdapter', () => {
    it('should register a database adapter', () => {
      // Create mock adapter
      const adapter = createMockDatabaseAdapter(DatabaseType.MONGODB);
      
      // Register adapter
      benchmarkService.registerDatabaseAdapter(adapter);
      
      // Verify events
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('database:registered', { 
        type: DatabaseType.MONGODB 
      });
      
      // Verify adapter is registered
      const registeredAdapter = benchmarkService.getDatabaseAdapter(DatabaseType.MONGODB);
      expect(registeredAdapter).toBe(adapter);
    });
  });
  
  describe('registerBenchmark', () => {
    it('should register a benchmark', () => {
      // Create mock benchmark
      const benchmark = createMockBenchmark('test-benchmark');
      
      // Register benchmark
      const result = benchmarkService.registerBenchmark(benchmark);
      
      // Verify result and events
      expect(result).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('benchmark:registered', { 
        name: 'test-benchmark' 
      });
      
      // Verify benchmark is registered
      const registered = benchmarkService.hasBenchmark('test-benchmark');
      expect(registered).toBe(true);
      
      const retrievedBenchmark = benchmarkService.getBenchmark('test-benchmark');
      expect(retrievedBenchmark).toBe(benchmark);
    });
    
    it('should not register a benchmark with a duplicate name', () => {
      // Create mock benchmarks
      const benchmark1 = createMockBenchmark('test-benchmark');
      const benchmark2 = createMockBenchmark('test-benchmark');
      
      // Register first benchmark
      benchmarkService.registerBenchmark(benchmark1);
      
      // Try to register second benchmark with same name
      const result = benchmarkService.registerBenchmark(benchmark2);
      
      // Verify result and events
      expect(result).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('benchmark:error', { 
        error: expect.any(Error)
      });
    });
  });
  
  describe('getAllBenchmarks', () => {
    it('should return all registered benchmarks', () => {
      // Create and register mock benchmarks
      const benchmark1 = createMockBenchmark('test-benchmark-1');
      const benchmark2 = createMockBenchmark('test-benchmark-2');
      
      benchmarkService.registerBenchmark(benchmark1);
      benchmarkService.registerBenchmark(benchmark2);
      
      // Get all benchmarks
      const benchmarks = benchmarkService.getAllBenchmarks();
      
      // Verify benchmarks
      expect(benchmarks.length).toBe(2);
      expect(benchmarks).toContain(benchmark1);
      expect(benchmarks).toContain(benchmark2);
    });
    
    it('should return an empty array if no benchmarks are registered', () => {
      const benchmarks = benchmarkService.getAllBenchmarks();
      expect(benchmarks).toEqual([]);
    });
  });
  
  describe('getDefaultOptions', () => {
    it('should return the default options', () => {
      const options = benchmarkService.getDefaultOptions();
      
      // Verify options match config
      expect(options).toEqual({
        size: DataSize.SMALL,
        iterations: 5,
        setupEnvironment: true,
        cleanupEnvironment: true,
        saveResults: false,
        outputDir: './benchmark-results',
        verbose: false,
        databaseOptions: {
          mongodb: {},
          postgresql: {}
        }
      });
    });
    
    it('should return a copy of the default options', () => {
      const options1 = benchmarkService.getDefaultOptions();
      const options2 = benchmarkService.getDefaultOptions();
      
      // Verify options are not the same object
      expect(options1).not.toBe(options2);
      
      // Modify one object should not affect the other
      options1.iterations = 10;
      expect(options2.iterations).toBe(5);
    });
  });
  
  // Additional tests for running benchmarks would be added here.
  // They would be more complex due to the async nature and the need to mock
  // file system operations, so they're omitted for brevity.
}); 