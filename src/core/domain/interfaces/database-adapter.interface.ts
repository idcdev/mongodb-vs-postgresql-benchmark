/**
 * Database adapter interface
 * 
 * This interface defines the contract that all database adapters must implement.
 * It provides a unified way to interact with different database technologies.
 */

export enum DatabaseType {
  MONGODB = 'mongodb',
  POSTGRESQL = 'postgresql',
  // Future database types can be added here
}

/**
 * Connection options for database adapters
 */
export interface ConnectionOptions {
  uri: string;
  poolSize?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  [key: string]: any; // Allow for database-specific options
}

/**
 * Query options for database operations
 */
export interface QueryOptions {
  timeout?: number;
  [key: string]: any; // Allow for database-specific options
}

/**
 * Core database adapter interface
 */
export interface DatabaseAdapter {
  /**
   * Get the type of database this adapter represents
   */
  getType(): DatabaseType;
  
  /**
   * Connect to the database
   */
  connect(options?: ConnectionOptions): Promise<void>;
  
  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if the connection is active
   */
  isConnected(): boolean;
  
  /**
   * Create a collection or table
   */
  createCollection(name: string, options?: any): Promise<void>;
  
  /**
   * Drop a collection or table
   */
  dropCollection(name: string): Promise<boolean>;
  
  /**
   * Insert a single document/record
   */
  insertOne(collection: string, document: any): Promise<any>;
  
  /**
   * Insert multiple documents/records
   */
  insertMany(collection: string, documents: any[]): Promise<any[]>;
  
  /**
   * Find documents/records by query
   */
  find(collection: string, query: any, options?: QueryOptions): Promise<any[]>;
  
  /**
   * Find a single document/record by query
   */
  findOne(collection: string, query: any, options?: QueryOptions): Promise<any | null>;
  
  /**
   * Find a document/record by its ID
   */
  findById(collection: string, id: string | number, options?: QueryOptions): Promise<any | null>;
  
  /**
   * Update a single document/record
   */
  updateOne(collection: string, query: any, update: any): Promise<any>;
  
  /**
   * Update multiple documents/records
   */
  updateMany(collection: string, query: any, update: any): Promise<any>;
  
  /**
   * Delete a single document/record
   */
  deleteOne(collection: string, query: any): Promise<boolean>;
  
  /**
   * Delete multiple documents/records
   */
  deleteMany(collection: string, query: any): Promise<number>;
  
  /**
   * Count documents/records
   */
  count(collection: string, query?: any): Promise<number>;
  
  /**
   * Execute a raw query (database-specific)
   */
  executeRawQuery(query: string, params?: any[]): Promise<any>;
} 