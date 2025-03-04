/**
 * MongoDB Adapter
 * 
 * Implementation of the DatabaseAdapter interface for MongoDB.
 * Provides methods to interact with MongoDB collections.
 */

import { MongoClient, Collection, Db, ObjectId, FindOptions } from 'mongodb';
import { ConfigProvider } from '../../domain/interfaces';
import { 
  DatabaseAdapter, 
  DatabaseType, 
  ConnectionOptions, 
  QueryOptions 
} from '../../domain/interfaces';

/**
 * MongoDB specific connection options
 */
export interface MongoConnectionOptions extends ConnectionOptions {
  authSource?: string;
  useNewUrlParser?: boolean;
  useUnifiedTopology?: boolean;
  [key: string]: any;
}

/**
 * MongoDB specific query options
 */
export interface MongoQueryOptions extends QueryOptions {
  projection?: Record<string, number | boolean>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  [key: string]: any;
}

// Helper type to prevent timeout conflicts
type SafeMongoOptions = Omit<any, 'timeout'> & {
  timeoutMS?: number;
};

/**
 * MongoDB adapter implementation
 */
export class MongoDBAdapter implements DatabaseAdapter {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private config: ConfigProvider;
  private collections: Map<string, Collection> = new Map();

  /**
   * Constructor
   * 
   * @param config - Configuration provider
   */
  constructor(config: ConfigProvider) {
    this.config = config;
  }

  /**
   * Get the database type
   * 
   * @returns The database type (MONGODB)
   */
  public getType(): DatabaseType {
    return DatabaseType.MONGODB;
  }

  /**
   * Connect to MongoDB
   * 
   * @param options - Connection options (optional)
   */
  public async connect(options?: MongoConnectionOptions): Promise<void> {
    if (this.client && this.isConnected()) {
      return;
    }

    try {
      // Use provided options or get from config
      const connectionOptions = options || this.getConnectionOptionsFromConfig();
      
      // Create MongoDB client with properly typed options
      this.client = new MongoClient(connectionOptions.uri, {
        maxPoolSize: connectionOptions.poolSize,
        connectTimeoutMS: connectionOptions.connectionTimeout,
        socketTimeoutMS: connectionOptions.idleTimeout,
        // Spread remaining options but exclude any that might conflict with typed ones
        ...((() => {
          const { uri, poolSize, connectionTimeout, idleTimeout, ...rest } = connectionOptions;
          return rest;
        })())
      });

      // Connect to MongoDB
      await this.client.connect();
      
      // Get database name from connection string or config
      const dbName = this.getDatabaseName(connectionOptions.uri);
      this.db = this.client.db(dbName);
    } catch (error) {
      this.client = null;
      this.db = null;
      throw new Error(`Failed to connect to MongoDB: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.db = null;
        this.collections.clear();
      } catch (error) {
        throw new Error(`Failed to disconnect from MongoDB: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Check if connected to MongoDB
   * 
   * @returns true if connected, false otherwise
   */
  public isConnected(): boolean {
    return !!this.client && !!this.db;
  }

  /**
   * Create a collection
   * 
   * @param name - The collection name
   * @param options - Collection options
   */
  public async createCollection(name: string, options?: any): Promise<void> {
    if (!this.db) {
      throw new Error('Not connected to MongoDB');
    }

    try {
      await this.db.createCollection(name, options);
    } catch (error) {
      // Ignore error if collection already exists
      if ((error as Error).message.includes('already exists')) {
        return;
      }
      throw new Error(`Failed to create collection ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Drop a collection
   * 
   * @param name - The collection name
   * @returns true if dropped, false if not found
   */
  public async dropCollection(name: string): Promise<boolean> {
    if (!this.db) {
      throw new Error('Not connected to MongoDB');
    }

    try {
      const collections = await this.db.listCollections({ name }).toArray();
      if (collections.length === 0) {
        return false;
      }
      
      await this.db.dropCollection(name);
      this.collections.delete(name);
      return true;
    } catch (error) {
      throw new Error(`Failed to drop collection ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Insert a single document
   * 
   * @param collection - The collection name
   * @param document - The document to insert
   * @returns The inserted document with _id
   */
  public async insertOne(collection: string, document: any): Promise<any> {
    const coll = await this.getCollection(collection);
    
    try {
      const result = await coll.insertOne(document);
      return { ...document, _id: result.insertedId };
    } catch (error) {
      throw new Error(`Failed to insert document into ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Insert multiple documents
   * 
   * @param collection - The collection name
   * @param documents - The documents to insert
   * @returns The inserted documents with _ids
   */
  public async insertMany(collection: string, documents: any[]): Promise<any[]> {
    if (!documents.length) {
      return [];
    }

    const coll = await this.getCollection(collection);
    
    try {
      const result = await coll.insertMany(documents);
      return documents.map((doc, index) => ({
        ...doc,
        _id: result.insertedIds[index]
      }));
    } catch (error) {
      throw new Error(`Failed to insert documents into ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find documents by query
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @param options - Query options
   * @returns Array of matching documents
   */
  public async find(
    collection: string,
    query: any,
    options?: MongoQueryOptions
  ): Promise<any[]> {
    const coll = await this.getCollection(collection);
    
    try {
      // Convert options to MongoDB FindOptions format
      const findOptions: FindOptions = {};
      
      if (options) {
        if (options.projection) findOptions.projection = options.projection;
        if (options.sort) findOptions.sort = options.sort;
        if (options.limit) findOptions.limit = options.limit;
        if (options.skip) findOptions.skip = options.skip;
        
        // Handle timeout as timeoutMS instead of timeout
        if (options.timeout) {
          (findOptions as SafeMongoOptions).timeoutMS = options.timeout;
        }
      }
      
      const cursor = coll.find(query, findOptions);
      return await cursor.toArray();
    } catch (error) {
      throw new Error(`Failed to find documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find a single document by query
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @param options - Query options
   * @returns The matching document or null
   */
  public async findOne(
    collection: string,
    query: any,
    options?: MongoQueryOptions
  ): Promise<any | null> {
    const coll = await this.getCollection(collection);
    
    try {
      // Convert options to MongoDB FindOptions format
      const findOptions: FindOptions = {};
      
      if (options) {
        if (options.projection) findOptions.projection = options.projection;
        
        // Handle timeout as timeoutMS instead of timeout
        if (options.timeout) {
          (findOptions as SafeMongoOptions).timeoutMS = options.timeout;
        }
      }
      
      return await coll.findOne(query, findOptions);
    } catch (error) {
      throw new Error(`Failed to find document in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find a document by ID
   * 
   * @param collection - The collection name
   * @param id - The document ID
   * @param options - Query options
   * @returns The matching document or null
   */
  public async findById(
    collection: string,
    id: string | number,
    options?: MongoQueryOptions
  ): Promise<any | null> {
    let objectId: ObjectId;
    
    try {
      objectId = new ObjectId(id.toString());
    } catch (error) {
      throw new Error(`Invalid MongoDB ObjectId: ${id}`);
    }
    
    return this.findOne(collection, { _id: objectId }, options);
  }

  /**
   * Update a single document
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @param update - The update operations
   * @returns The updated document
   */
  public async updateOne(collection: string, query: any, update: any): Promise<any> {
    const coll = await this.getCollection(collection);
    
    try {
      // Ensure update uses operators like $set if not already present
      const updateObj = update.$set || update.$push || update.$pull ? 
        update : 
        { $set: update };
      
      const result = await coll.findOneAndUpdate(
        query,
        updateObj,
        { returnDocument: 'after' }
      );
      
      return result?.value || null;
    } catch (error) {
      throw new Error(`Failed to update document in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Update multiple documents
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @param update - The update operations
   * @returns The result with modifiedCount
   */
  public async updateMany(collection: string, query: any, update: any): Promise<any> {
    const coll = await this.getCollection(collection);
    
    try {
      // Ensure update uses operators like $set if not already present
      const updateObj = update.$set || update.$push || update.$pull ? 
        update : 
        { $set: update };
      
      const result = await coll.updateMany(query, updateObj);
      
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId
      };
    } catch (error) {
      throw new Error(`Failed to update documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a single document
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @returns true if deleted, false if not found
   */
  public async deleteOne(collection: string, query: any): Promise<boolean> {
    const coll = await this.getCollection(collection);
    
    try {
      const result = await coll.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete document from ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete multiple documents
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @returns The number of deleted documents
   */
  public async deleteMany(collection: string, query: any): Promise<number> {
    const coll = await this.getCollection(collection);
    
    try {
      const result = await coll.deleteMany(query);
      return result.deletedCount;
    } catch (error) {
      throw new Error(`Failed to delete documents from ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Count documents
   * 
   * @param collection - The collection name
   * @param query - The query to filter documents
   * @returns The number of matching documents
   */
  public async count(collection: string, query?: any): Promise<number> {
    const coll = await this.getCollection(collection);
    
    try {
      return await coll.countDocuments(query || {});
    } catch (error) {
      throw new Error(`Failed to count documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a raw MongoDB command
   * 
   * @param query - The command to execute
   * @returns The command result
   */
  public async executeRawQuery(query: string): Promise<any> {
    if (!this.db) {
      throw new Error('Not connected to MongoDB');
    }
    
    try {
      // For MongoDB, we expect the query to be a JSON string representing a command
      const command = JSON.parse(query);
      return await this.db.command(command);
    } catch (error) {
      throw new Error(`Failed to execute MongoDB command: ${(error as Error).message}`);
    }
  }

  /**
   * Get a collection
   * 
   * @param name - The collection name
   * @returns The MongoDB collection
   */
  private async getCollection(name: string): Promise<Collection> {
    if (!this.db) {
      throw new Error('Not connected to MongoDB');
    }
    
    if (!this.collections.has(name)) {
      // Create the collection if it doesn't exist
      try {
        const collections = await this.db.listCollections({ name }).toArray();
        if (collections.length === 0) {
          await this.createCollection(name);
        }
        this.collections.set(name, this.db.collection(name));
      } catch (error) {
        throw new Error(`Failed to get collection ${name}: ${(error as Error).message}`);
      }
    }
    
    return this.collections.get(name)!;
  }

  /**
   * Get connection options from configuration
   * 
   * @returns MongoDB connection options
   */
  private getConnectionOptionsFromConfig(): MongoConnectionOptions {
    const dbConfig = this.config.get('databases.mongodb', {}) as Record<string, any>;
    const host = dbConfig.host || 'localhost';
    const port = dbConfig.port || 27017;
    const username = dbConfig.username || '';
    const password = dbConfig.password || '';
    const database = dbConfig.database || 'benchmark';
    const authSource = dbConfig.authSource || 'admin';
    const poolSize = dbConfig.poolSize || 10;
    const connectionTimeout = dbConfig.connectionTimeout || 30000;
    const idleTimeout = dbConfig.idleTimeout || 60000;
    
    // Build connection URI
    let uri = 'mongodb://';
    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    uri += `${host}:${port}/${database}`;
    
    return {
      uri,
      authSource,
      poolSize,
      connectionTimeout,
      idleTimeout,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
  }

  /**
   * Extract database name from MongoDB URI
   * 
   * @param uri - MongoDB connection URI
   * @returns The database name
   */
  private getDatabaseName(uri: string): string {
    try {
      // Extract database name from URI
      const matches = uri.match(/\/([^/?]+)(\?|$)/);
      return matches ? matches[1] : 'benchmark';
    } catch (error) {
      return 'benchmark';
    }
  }
} 