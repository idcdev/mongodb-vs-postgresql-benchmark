/**
 * Benchmark options model
 * 
 * This model defines the configuration options for benchmark execution.
 */

/**
 * Data size enum for benchmarks
 */
export enum DataSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  CUSTOM = 'custom'
}

/**
 * Benchmark execution options
 */
export interface BenchmarkOptions {
  /**
   * Size of the data set to use for the benchmark
   */
  size: DataSize | string;
  
  /**
   * Number of documents/records for custom size
   */
  customSize?: number;
  
  /**
   * Number of iterations to run
   */
  iterations: number;
  
  /**
   * Whether to set up the environment before running
   */
  setupEnvironment: boolean;
  
  /**
   * Whether to clean up the environment after running
   */
  cleanupEnvironment: boolean;
  
  /**
   * Whether to save the results to a file
   */
  saveResults: boolean;
  
  /**
   * Output directory for results
   */
  outputDir?: string;
  
  /**
   * Database specific options
   */
  databaseOptions?: {
    mongodb?: Record<string, any>;
    postgresql?: Record<string, any>;
    [key: string]: Record<string, any> | undefined;
  };
  
  /**
   * Whether to run the benchmark in verbose mode
   */
  verbose?: boolean;
  
  /**
   * Custom tags for the benchmark run
   */
  tags?: string[];
  
  /**
   * Additional custom options
   */
  [key: string]: any;
}