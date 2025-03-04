/**
 * Base Benchmark Class
 * 
 * This abstract class provides a foundation for all benchmark implementations.
 * It implements common functionality and ensures consistent behavior across benchmarks.
 */

import { Benchmark } from '../interfaces/benchmark.interface';
import { BenchmarkOptions, DataSize } from './benchmark-options';
import { BenchmarkResult, EnvironmentInfo } from './benchmark-result';
import { DatabaseType } from '../interfaces/database-adapter.interface';

/**
 * Abstract base class for benchmarks
 */
export abstract class BaseBenchmark implements Benchmark {
  /**
   * The name of the benchmark
   */
  protected readonly name: string;
  
  /**
   * The description of the benchmark
   */
  protected readonly description: string;
  
  /**
   * The supported database types
   */
  protected readonly supportedDatabases: DatabaseType[];
  
  /**
   * Constructor
   * 
   * @param name - The name of the benchmark
   * @param description - The description of the benchmark
   * @param supportedDatabases - The supported database types
   */
  constructor(
    name: string,
    description: string,
    supportedDatabases: DatabaseType[] = [DatabaseType.MONGODB, DatabaseType.POSTGRESQL]
  ) {
    this.name = name;
    this.description = description;
    this.supportedDatabases = supportedDatabases;
  }
  
  /**
   * Get the name of the benchmark
   */
  public getName(): string {
    return this.name;
  }
  
  /**
   * Get the description of the benchmark
   */
  public getDescription(): string {
    return this.description;
  }
  
  /**
   * Get the supported database types
   */
  public getSupportedDatabases(): string[] {
    return this.supportedDatabases;
  }
  
  /**
   * Check if the benchmark supports a specific database type
   */
  public supportsDatabase(databaseType: string): boolean {
    return this.supportedDatabases.includes(databaseType as DatabaseType);
  }
  
  /**
   * Get the default options for this benchmark
   */
  public getDefaultOptions(): BenchmarkOptions {
    return {
      size: DataSize.SMALL,
      iterations: 5,
      setupEnvironment: true,
      cleanupEnvironment: true,
      saveResults: true,
      verbose: false
    };
  }
  
  /**
   * Setup the benchmark environment
   * This must be implemented by concrete classes
   */
  public abstract setup(options: BenchmarkOptions): Promise<void>;
  
  /**
   * Run the benchmark
   * This must be implemented by concrete classes
   */
  public abstract run(options: BenchmarkOptions): Promise<BenchmarkResult>;
  
  /**
   * Clean up the benchmark environment
   * This must be implemented by concrete classes
   */
  public abstract cleanup(options: BenchmarkOptions): Promise<void>;
  
  /**
   * Helper method to get the number of documents/records based on size
   */
  protected getDataSize(size: DataSize | string, customSize?: number): number {
    if (customSize !== undefined && size === DataSize.CUSTOM) {
      return customSize;
    }
    
    const sizes: Record<DataSize, number> = {
      [DataSize.SMALL]: 1000,
      [DataSize.MEDIUM]: 10000,
      [DataSize.LARGE]: 100000,
      [DataSize.CUSTOM]: customSize || 1000
    };
    
    return sizes[size as DataSize] || sizes[DataSize.SMALL];
  }
  
  /**
   * Helper method to get environment information
   */
  protected getEnvironmentInfo(): EnvironmentInfo {
    const os = require('os');
    const process = require('process');
    
    return {
      os: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        architecture: os.arch()
      },
      nodejs: {
        version: process.version,
        memoryUsage: process.memoryUsage()
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
} 