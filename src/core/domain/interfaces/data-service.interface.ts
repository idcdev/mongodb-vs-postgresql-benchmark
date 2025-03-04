/**
 * Data Service Interface
 * 
 * This interface defines the contract for the data service,
 * which is responsible for generating and managing test data for benchmarks.
 */

import { DataSize } from '../model/benchmark-options';

/**
 * Data generation options
 */
export interface DataGenerationOptions {
  /**
   * Size of the data to generate
   */
  size: DataSize | number;
  
  /**
   * Schema of the data to generate
   */
  schema?: Record<string, any>;
  
  /**
   * Whether to include nested objects
   */
  includeNested?: boolean;
  
  /**
   * Maximum depth for nested objects
   */
  maxDepth?: number;
  
  /**
   * Whether to include arrays
   */
  includeArrays?: boolean;
  
  /**
   * Maximum array length
   */
  maxArrayLength?: number;
  
  /**
   * Random seed for reproducible data generation
   */
  seed?: number;
  
  /**
   * Whether to include null values
   */
  includeNulls?: boolean;
  
  /**
   * Percentage of fields that should be null (0-100)
   */
  nullPercentage?: number;
}

/**
 * Data cache options
 */
export interface DataCacheOptions {
  /**
   * Whether to enable caching
   */
  enabled: boolean;
  
  /**
   * Directory to store cached data
   */
  directory?: string;
  
  /**
   * Maximum age of cached data in milliseconds
   */
  maxAge?: number;
  
  /**
   * Whether to compress cached data
   */
  compress?: boolean;
}

/**
 * Core data service interface
 */
export interface DataService {
  /**
   * Generate test data
   * 
   * @param options - Data generation options
   * @returns A promise that resolves to the generated data
   */
  generateData(options: DataGenerationOptions): Promise<any[]>;
  
  /**
   * Get test data, either from cache or by generating it
   * 
   * @param options - Data generation options
   * @returns A promise that resolves to the data
   */
  getData(options: DataGenerationOptions): Promise<any[]>;
  
  /**
   * Save generated data to cache
   * 
   * @param data - The data to cache
   * @param options - Data generation options used to create the data
   * @returns A promise that resolves when the data is cached
   */
  cacheData(data: any[], options: DataGenerationOptions): Promise<void>;
  
  /**
   * Check if data exists in cache
   * 
   * @param options - Data generation options
   * @returns A promise that resolves to true if data exists in cache, false otherwise
   */
  hasCache(options: DataGenerationOptions): Promise<boolean>;
  
  /**
   * Get data from cache
   * 
   * @param options - Data generation options
   * @returns A promise that resolves to the cached data or null if not found
   */
  getFromCache(options: DataGenerationOptions): Promise<any[] | null>;
  
  /**
   * Clear the data cache
   * 
   * @returns A promise that resolves when the cache is cleared
   */
  clearCache(): Promise<void>;
  
  /**
   * Configure the data service
   * 
   * @param cacheOptions - Data cache options
   * @returns The data service instance
   */
  configure(cacheOptions: DataCacheOptions): DataService;
  
  /**
   * Get the estimated size of data in bytes
   * 
   * @param data - The data to measure
   * @returns The estimated size in bytes
   */
  getDataSize(data: any[]): number;
  
  /**
   * Get the default data generation options
   * 
   * @returns Default data generation options
   */
  getDefaultOptions(): DataGenerationOptions;
} 