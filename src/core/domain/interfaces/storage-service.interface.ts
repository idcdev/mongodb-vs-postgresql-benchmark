/**
 * Storage Service Interface
 * 
 * This interface defines the contract for the storage service,
 * which is responsible for persisting and retrieving data.
 */

/**
 * Storage options
 */
export interface StorageOptions {
  /**
   * Base directory for storage
   */
  baseDir?: string;
  
  /**
   * Whether to create directories if they don't exist
   */
  createDirs?: boolean;
  
  /**
   * Whether to compress stored data
   */
  compress?: boolean;
  
  /**
   * File extension to use
   */
  extension?: string;
  
  /**
   * Encoding to use for text files
   */
  encoding?: BufferEncoding;
}

/**
 * Storage item metadata
 */
export interface StorageItemMetadata {
  /**
   * Key of the item
   */
  key: string;
  
  /**
   * Size of the item in bytes
   */
  size: number;
  
  /**
   * Last modified timestamp
   */
  lastModified: Date;
  
  /**
   * MIME type of the item (if known)
   */
  contentType?: string;
  
  /**
   * Whether the item is compressed
   */
  compressed?: boolean;
  
  /**
   * Custom metadata
   */
  custom?: Record<string, any>;
}

/**
 * Core storage service interface
 */
export interface StorageService {
  /**
   * Store data
   * 
   * @param key - Key to store the data under
   * @param data - Data to store
   * @param options - Storage options
   * @returns A promise that resolves when the data is stored
   */
  store(key: string, data: any, options?: Partial<StorageOptions>): Promise<void>;
  
  /**
   * Retrieve data
   * 
   * @param key - Key of the data to retrieve
   * @param options - Storage options
   * @returns A promise that resolves to the retrieved data or null if not found
   */
  retrieve<T = any>(key: string, options?: Partial<StorageOptions>): Promise<T | null>;
  
  /**
   * Check if data exists
   * 
   * @param key - Key to check
   * @param options - Storage options
   * @returns A promise that resolves to true if the data exists, false otherwise
   */
  exists(key: string, options?: Partial<StorageOptions>): Promise<boolean>;
  
  /**
   * Delete data
   * 
   * @param key - Key of the data to delete
   * @param options - Storage options
   * @returns A promise that resolves to true if the data was deleted, false otherwise
   */
  delete(key: string, options?: Partial<StorageOptions>): Promise<boolean>;
  
  /**
   * List keys with optional prefix
   * 
   * @param prefix - Optional prefix to filter keys
   * @param options - Storage options
   * @returns A promise that resolves to an array of keys
   */
  list(prefix?: string, options?: Partial<StorageOptions>): Promise<string[]>;
  
  /**
   * Get metadata for a stored item
   * 
   * @param key - Key of the item
   * @param options - Storage options
   * @returns A promise that resolves to the item metadata or null if not found
   */
  getMetadata(key: string, options?: Partial<StorageOptions>): Promise<StorageItemMetadata | null>;
  
  /**
   * Clear all stored data
   * 
   * @param prefix - Optional prefix to limit what is cleared
   * @param options - Storage options
   * @returns A promise that resolves when the data is cleared
   */
  clear(prefix?: string, options?: Partial<StorageOptions>): Promise<void>;
  
  /**
   * Configure the storage service
   * 
   * @param options - Storage options
   * @returns The storage service instance
   */
  configure(options: StorageOptions): StorageService;
  
  /**
   * Get the default storage options
   * 
   * @returns Default storage options
   */
  getDefaultOptions(): StorageOptions;
} 