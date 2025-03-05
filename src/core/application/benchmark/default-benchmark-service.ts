/**
 * Default Benchmark Service
 * 
 * Implementation of the BenchmarkService interface for executing benchmarks.
 */

import { 
  BenchmarkService, 
  Benchmark, 
  DatabaseAdapter,
  DatabaseType,
  ConfigProvider,
  EventEmitter
} from '../../domain/interfaces';
import { BenchmarkOptions, DataSize } from '../../domain/model/benchmark-options';
import { 
  BenchmarkResult, 
  BenchmarkComparison, 
  EnvironmentInfo,
  DatabaseBenchmarkResult
} from '../../domain/model/benchmark-result';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default benchmark service implementation
 */
export class DefaultBenchmarkService implements BenchmarkService {
  private benchmarks: Map<string, Benchmark> = new Map();
  private databaseAdapters: Map<DatabaseType, DatabaseAdapter> = new Map();
  private config: ConfigProvider;
  private eventEmitter: EventEmitter;
  private defaultOptions: BenchmarkOptions;

  /**
   * Constructor
   * 
   * @param config - Configuration provider
   * @param eventEmitter - Event emitter
   */
  constructor(config: ConfigProvider, eventEmitter: EventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.defaultOptions = this.initDefaultOptions();
  }

  /**
   * Register a database adapter for use in benchmarks
   * 
   * @param adapter - The database adapter to register
   */
  public registerDatabaseAdapter(adapter: DatabaseAdapter): void {
    const type = adapter.getType();
    this.databaseAdapters.set(type, adapter);
    this.eventEmitter.emit('database:registered', { type });
  }

  /**
   * Get a registered database adapter by type
   * 
   * @param type - The database type
   * @returns The database adapter or null if not found
   */
  public getDatabaseAdapter(type: DatabaseType): DatabaseAdapter | null {
    return this.databaseAdapters.get(type) || null;
  }

  /**
   * Register a benchmark with the service
   * 
   * @param benchmark - The benchmark to register
   * @returns true if registration was successful, false otherwise
   */
  public registerBenchmark(benchmark: Benchmark): boolean {
    try {
      const name = benchmark.getName();
      
      if (this.benchmarks.has(name)) {
        throw new Error(`Benchmark with name '${name}' already exists`);
      }
      
      this.benchmarks.set(name, benchmark);
      this.eventEmitter.emit('benchmark:registered', { name });
      
      return true;
    } catch (error) {
      this.eventEmitter.emit('benchmark:error', { error });
      return false;
    }
  }

  /**
   * Get a registered benchmark by name
   * 
   * @param name - The name of the benchmark
   * @returns The benchmark or null if not found
   */
  public getBenchmark(name: string): Benchmark | null {
    return this.benchmarks.get(name) || null;
  }

  /**
   * Get all registered benchmarks
   * 
   * @returns Array of registered benchmarks
   */
  public getAllBenchmarks(): Benchmark[] {
    return Array.from(this.benchmarks.values());
  }

  /**
   * Run a specific benchmark
   * 
   * @param name - The name of the benchmark to run
   * @param options - The options for the benchmark
   * @returns The benchmark results
   */
  public async runBenchmark(
    name: string, 
    options?: Partial<BenchmarkOptions>
  ): Promise<BenchmarkResult> {
    try {
      const benchmark = this.getBenchmark(name);
      
      if (!benchmark) {
        throw new Error(`Benchmark with name '${name}' not found`);
      }
      
      // Merge options with defaults
      const benchmarkOptions = this.mergeOptions(
        benchmark.getDefaultOptions(),
        this.defaultOptions,
        options || {}
      );
      
      // Emit event only once at the beginning
      this.eventEmitter.emit('benchmark:started', { name, options: benchmarkOptions });
      
      // Prepare result object
      const result: BenchmarkResult = {
        name: benchmark.getName(),
        description: benchmark.getDescription(),
        timestamp: new Date().toISOString(),
        environment: this.getEnvironmentInfo()
      };
      
      // Run with MongoDB if supported
      if (benchmark.supportsDatabase(DatabaseType.MONGODB)) {
        const dbResult = await this.runBenchmarkWithDatabase(name, DatabaseType.MONGODB, benchmarkOptions);
        result.mongodb = dbResult as unknown as DatabaseBenchmarkResult;
      }
      
      // Run with PostgreSQL if supported
      if (benchmark.supportsDatabase(DatabaseType.POSTGRESQL)) {
        const dbResult = await this.runBenchmarkWithDatabase(name, DatabaseType.POSTGRESQL, benchmarkOptions);
        result.postgresql = dbResult as unknown as DatabaseBenchmarkResult;
      }
      
      // Generate comparison if both databases were benchmarked
      if (result.mongodb && result.postgresql) {
        result.comparison = this.generateComparison(result.mongodb, result.postgresql);
      }
      
      // Save results if configured
      if (benchmarkOptions.saveResults) {
        await this.saveResults(name, result);
      }
      
      // Emit completion event only once at the end
      this.eventEmitter.emit('benchmark:completed', { name, result });
      
      return result;
    } catch (error) {
      this.eventEmitter.emit('benchmark:error', { name, error });
      throw error;
    }
  }

  /**
   * Run a specific benchmark with a specific database
   * 
   * @param name - The name of the benchmark to run
   * @param databaseType - The type of database to benchmark
   * @param options - The options for the benchmark
   * @returns The benchmark results
   */
  public async runBenchmarkWithDatabase(
    name: string,
    databaseType: DatabaseType,
    options?: Partial<BenchmarkOptions>
  ): Promise<BenchmarkResult> {
    try {
      const benchmark = this.getBenchmark(name);
      
      if (!benchmark) {
        throw new Error(`Benchmark with name '${name}' not found`);
      }
      
      if (!benchmark.supportsDatabase(databaseType.toString())) {
        throw new Error(`Benchmark '${name}' does not support database type '${databaseType}'`);
      }
      
      // Merge options with defaults
      const benchmarkOptions = this.mergeOptions(
        benchmark.getDefaultOptions(),
        this.defaultOptions,
        options || {}
      );
      
      // Set the target database in the options
      if (!benchmarkOptions.databaseOptions) {
        benchmarkOptions.databaseOptions = {
          mongodb: {},
          postgresql: {}
        };
      }
      
      // Adicionar uma propriedade personalizada para o banco de dados alvo
      benchmarkOptions.targetDatabase = databaseType.toString();
      
      this.eventEmitter.emit('benchmark:database:started', { 
        name, 
        databaseType, 
        options: benchmarkOptions 
      });
      
      // Connect to database if not already connected
      const adapter = this.getDatabaseAdapter(databaseType);
      if (!adapter) {
        throw new Error(`Database adapter for type '${databaseType}' not found`);
      }
      if (!adapter.isConnected()) {
        await adapter.connect();
      }
      
      // Setup benchmark environment if configured
      if (benchmarkOptions.setupEnvironment) {
        await benchmark.setup(benchmarkOptions);
      }
      
      // Run the benchmark
      const result = await benchmark.run(benchmarkOptions);
      
      // Clean up benchmark environment if configured
      if (benchmarkOptions.cleanupEnvironment) {
        await benchmark.cleanup(benchmarkOptions);
      }
      
      this.eventEmitter.emit('benchmark:database:completed', { 
        name, 
        databaseType, 
        result 
      });
      
      return result;
    } catch (error) {
      this.eventEmitter.emit('benchmark:database:error', { 
        name, 
        databaseType, 
        error 
      });
      throw error;
    }
  }

  /**
   * Run all registered benchmarks
   * 
   * @param options - The options for the benchmarks
   * @returns The benchmark results for all benchmarks
   */
  public async runAllBenchmarks(
    options?: Partial<BenchmarkOptions>
  ): Promise<Record<string, BenchmarkResult>> {
    const results: Record<string, BenchmarkResult> = {};
    const benchmarks = this.getAllBenchmarks();
    
    this.eventEmitter.emit('benchmark:all:started', { 
      count: benchmarks.length,
      options 
    });
    
    for (const benchmark of benchmarks) {
      const name = benchmark.getName();
      try {
        results[name] = await this.runBenchmark(name, options);
      } catch (error) {
        this.eventEmitter.emit('benchmark:all:error', { 
          name, 
          error 
        });
        
        // Continue with next benchmark even if one fails
        results[name] = {
          name,
          description: benchmark.getDescription(),
          timestamp: new Date().toISOString(),
          environment: this.getEnvironmentInfo(),
          error: (error as Error).message
        } as BenchmarkResult;
      }
    }
    
    this.eventEmitter.emit('benchmark:all:completed', { results });
    
    return results;
  }

  /**
   * Check if a benchmark is registered
   * 
   * @param name - The name of the benchmark
   * @returns true if the benchmark is registered, false otherwise
   */
  public hasBenchmark(name: string): boolean {
    return this.benchmarks.has(name);
  }

  /**
   * Get the default options for benchmarks
   * 
   * @returns The default benchmark options
   */
  public getDefaultOptions(): BenchmarkOptions {
    return { ...this.defaultOptions };
  }

  /**
   * Save benchmark results
   * 
   * @param name - The name of the benchmark
   * @param results - The benchmark results
   * @returns A promise that resolves when the results are saved
   */
  public async saveResults(name: string, results: BenchmarkResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputDir = results.mongodb?.operation?.metadata?.outputDir || 
                       results.postgresql?.operation?.metadata?.outputDir ||
                       this.defaultOptions.outputDir ||
                       './benchmark-results';
      
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, `${name}-${timestamp}.json`);
      
      // Create a clean copy of the results without the top-level comparison
      // if it's already present in the mongodb/postgresql results
      const resultsToSave = { ...results };
      
      // If we have nested comparison objects in both mongodb and postgresql results,
      // remove the top-level comparison to avoid confusion
      if (resultsToSave.mongodb && resultsToSave.postgresql && 
          (resultsToSave.mongodb as any).comparison && 
          (resultsToSave.postgresql as any).comparison) {
        delete resultsToSave.comparison;
      }
      
      // Write results to file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(resultsToSave, null, 2),
        'utf8'
      );
      
      this.eventEmitter.emit('benchmark:results:saved', { 
        name, 
        filePath 
      });
    } catch (error) {
      this.eventEmitter.emit('benchmark:results:error', { 
        name, 
        error 
      });
      throw new Error(`Failed to save benchmark results: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize default benchmark options
   * 
   * @returns Default benchmark options
   */
  private initDefaultOptions(): BenchmarkOptions {
    const configOptions = this.config.get('benchmarks.defaultOptions', {}) as Record<string, any>;
    
    return {
      size: configOptions.size || DataSize.SMALL,
      customSize: configOptions.customSize,
      iterations: configOptions.iterations || 5,
      setupEnvironment: configOptions.setupEnvironment !== undefined ? 
                         configOptions.setupEnvironment : true,
      cleanupEnvironment: configOptions.cleanupEnvironment !== undefined ? 
                          configOptions.cleanupEnvironment : true,
      saveResults: configOptions.saveResults !== undefined ? 
                   configOptions.saveResults : true,
      outputDir: configOptions.outputDir || './benchmark-results',
      verbose: configOptions.verbose !== undefined ? 
                configOptions.verbose : false,
      databaseOptions: configOptions.databaseOptions || {
        mongodb: {},
        postgresql: {}
      }
    };
  }

  /**
   * Merge benchmark options
   * 
   * @param benchmarkDefaults - Benchmark-specific default options
   * @param serviceDefaults - Service-wide default options
   * @param userOptions - User-provided options
   * @returns Merged options
   */
  private mergeOptions(
    benchmarkDefaults: BenchmarkOptions,
    serviceDefaults: BenchmarkOptions,
    userOptions: Partial<BenchmarkOptions>
  ): BenchmarkOptions {
    // Start with service defaults
    const mergedOptions = { ...serviceDefaults };
    
    // Override with benchmark-specific defaults
    Object.entries(benchmarkDefaults).forEach(([key, value]) => {
      if (value !== undefined) {
        (mergedOptions as any)[key] = value;
      }
    });
    
    // Override with user options
    Object.entries(userOptions).forEach(([key, value]) => {
      if (value !== undefined) {
        (mergedOptions as any)[key] = value;
      }
    });
    
    // Merge database options separately to avoid complete overrides
    if (benchmarkDefaults.databaseOptions) {
      mergedOptions.databaseOptions = { 
        ...mergedOptions.databaseOptions 
      };
      
      Object.entries(benchmarkDefaults.databaseOptions).forEach(([dbType, options]) => {
        mergedOptions.databaseOptions![dbType] = {
          ...(mergedOptions.databaseOptions![dbType] || {}),
          ...options
        };
      });
    }
    
    if (userOptions.databaseOptions) {
      mergedOptions.databaseOptions = { 
        ...mergedOptions.databaseOptions 
      };
      
      Object.entries(userOptions.databaseOptions).forEach(([dbType, options]) => {
        mergedOptions.databaseOptions![dbType] = {
          ...(mergedOptions.databaseOptions![dbType] || {}),
          ...options
        };
      });
    }
    
    return mergedOptions;
  }

  /**
   * Get environment information for benchmarks
   * 
   * @returns Environment information
   */
  private getEnvironmentInfo(): EnvironmentInfo {
    const memUsage = process.memoryUsage();
    // Convert NodeJS.MemoryUsage to Record<string, number>
    const memoryUsage: Record<string, number> = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0
    };
    
    return {
      os: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        architecture: os.arch()
      },
      nodejs: {
        version: process.version,
        memoryUsage
      },
      database: {
        type: 'multiple',
        version: 'multiple'
      },
      hardware: {
        cpu: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length,
        memory: os.totalmem()
      }
    };
  }

  /**
   * Generate a comparison between MongoDB and PostgreSQL results
   * 
   * @param mongodbResult - MongoDB benchmark result
   * @param postgresqlResult - PostgreSQL benchmark result
   * @returns Comparison between the two results
   */
  private generateComparison(mongodbResult: any, postgresqlResult: any): BenchmarkComparison {
    // Check if results are valid
    if (!mongodbResult || !postgresqlResult || 
        !mongodbResult.statistics || !postgresqlResult.statistics ||
        !mongodbResult.statistics.meanDurationMs || !postgresqlResult.statistics.meanDurationMs) {
      // Return default comparison if results are invalid
      return {
        meanDiffMs: 0,
        medianDiffMs: 0,
        medianRatio: 1,
        percentageDiff: 0,
        winner: DatabaseType.MONGODB // Default winner
      };
    }
    
    const mongoMean = mongodbResult.statistics.meanDurationMs;
    const mongoMedian = mongodbResult.statistics.medianDurationMs;
    const postgresMean = postgresqlResult.statistics.meanDurationMs;
    const postgresMedian = postgresqlResult.statistics.medianDurationMs;
    
    // Determine winner based on which database has the lower median duration
    let winner = DatabaseType.MONGODB;
    let percentageDiff: number;
    
    if (postgresMedian < mongoMedian) {
      winner = DatabaseType.POSTGRESQL;
      // Calculate how much faster PostgreSQL is compared to MongoDB
      percentageDiff = ((mongoMedian - postgresMedian) / mongoMedian) * 100;
    } else {
      // Calculate how much faster MongoDB is compared to PostgreSQL
      percentageDiff = ((postgresMedian - mongoMedian) / postgresMedian) * 100;
    }
    
    // Calculate absolute differences
    const meanDiffMs = Math.abs(postgresMean - mongoMean);
    const medianDiffMs = Math.abs(postgresMedian - mongoMedian);
    
    // Calculate median ratio consistently (always > 1)
    const medianRatio = postgresMedian > mongoMedian 
      ? postgresMedian / mongoMedian 
      : mongoMedian / postgresMedian;
    
    return {
      meanDiffMs,
      medianDiffMs,
      medianRatio,
      percentageDiff,
      winner
    };
  }
} 