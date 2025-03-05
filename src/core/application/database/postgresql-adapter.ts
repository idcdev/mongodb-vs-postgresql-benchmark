/**
 * PostgreSQL Adapter
 * 
 * Implementation of the DatabaseAdapter interface for PostgreSQL.
 * Provides methods to interact with PostgreSQL tables.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { ConfigProvider } from '../../domain/interfaces';
import { 
  DatabaseAdapter, 
  DatabaseType, 
  ConnectionOptions, 
  QueryOptions 
} from '../../domain/interfaces';

/**
 * PostgreSQL specific connection options
 */
export interface PostgresConnectionOptions extends Omit<ConnectionOptions, 'uri'> {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  poolSize?: number;
  uri?: string;
  [key: string]: any;
}

/**
 * PostgreSQL specific query options
 */
export interface PostgresQueryOptions extends QueryOptions {
  returningSingle?: boolean;
  returning?: string | string[];
  [key: string]: any;
}

/**
 * PostgreSQL adapter implementation
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;
  private config: ConfigProvider;
  private tablesCreated: Set<string> = new Set();

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
   * @returns The database type (POSTGRESQL)
   */
  public getType(): DatabaseType {
    return DatabaseType.POSTGRESQL;
  }

  /**
   * Connect to PostgreSQL
   * 
   * @param options - Connection options (optional)
   */
  public async connect(options?: PostgresConnectionOptions): Promise<void> {
    if (this.pool && this.isConnected()) {
      return;
    }

    try {
      // Use provided options or get from config
      const connectionOptions = options || this.getConnectionOptionsFromConfig();
      
      // Ensure password is a string
      if (connectionOptions.password !== undefined) {
        connectionOptions.password = String(connectionOptions.password);
      }
      
      // Create PostgreSQL pool
      this.pool = new Pool({
        host: connectionOptions.host,
        port: connectionOptions.port,
        user: connectionOptions.user,
        password: connectionOptions.password,
        database: connectionOptions.database,
        ssl: connectionOptions.ssl,
        connectionTimeoutMillis: connectionOptions.connectionTimeoutMillis,
        idleTimeoutMillis: connectionOptions.idleTimeoutMillis,
        max: connectionOptions.poolSize,
        ...connectionOptions
      });

      // Verify connection by trying to connect
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      this.pool = null;
      throw new Error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from PostgreSQL
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        this.tablesCreated.clear();
      } catch (error) {
        throw new Error(`Failed to disconnect from PostgreSQL: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Check if connected to PostgreSQL
   * 
   * @returns true if connected, false otherwise
   */
  public isConnected(): boolean {
    if (!this.pool) {
      return false;
    }
    
    try {
      // Check if pool is still active
      return !this.pool.ended;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a table (collection in PostgreSQL context)
   * 
   * @param name - The table name
   * @param options - Table creation options
   */
  public async createCollection(name: string, options?: any): Promise<void> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    // Basic table creation if schema is not provided
    try {
      const tableExists = await this.checkTableExists(name);
      if (tableExists) {
        this.tablesCreated.add(name);
        return;
      }
      
      // Default schema if not specified
      const schema = options?.schema || {
        id: 'SERIAL PRIMARY KEY',
        data: 'JSONB NOT NULL',
        created_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP',
        updated_at: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP'
      };
      
      let query = `CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(name)} (`;
      
      // Convert schema object to SQL column definitions
      const columns = Object.entries(schema).map(([column, type]) => 
        `${this.escapeIdentifier(column)} ${type}`
      );
      
      query += columns.join(', ');
      query += ')';
      
      await this.executeRawQuery(query);
      this.tablesCreated.add(name);
    } catch (error) {
      throw new Error(`Failed to create table ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Drop a table (collection in PostgreSQL context)
   * 
   * @param name - The table name
   * @returns true if dropped, false if not found
   */
  public async dropCollection(name: string): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    try {
      const tableExists = await this.checkTableExists(name);
      if (!tableExists) {
        return false;
      }
      
      await this.executeRawQuery(`DROP TABLE ${this.escapeIdentifier(name)}`);
      this.tablesCreated.delete(name);
      return true;
    } catch (error) {
      throw new Error(`Failed to drop table ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Insert a single document
   * 
   * @param collection - The table name
   * @param document - The document to insert
   * @returns The inserted document with id
   */
  public async insertOne(collection: string, document: any): Promise<any> {
    await this.ensureTableExists(collection);
    
    try {
      // Default behavior: Store data as JSONB in 'data' column with auto-generated ID
      const query = `
        INSERT INTO ${this.escapeIdentifier(collection)} (data) 
        VALUES ($1) 
        RETURNING id, data, created_at, updated_at
      `;
      
      const result = await this.executeRawQuery(query, [document]);
      
      if (result.rows.length === 0) {
        throw new Error('Insert operation did not return data');
      }
      
      const row = result.rows[0];
      return {
        ...row.data,
        _id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      throw new Error(`Failed to insert document into ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Insert multiple documents
   * 
   * @param collection - The table name
   * @param documents - The documents to insert
   * @returns The inserted documents with ids
   */
  public async insertMany(collection: string, documents: any[]): Promise<any[]> {
    if (!documents.length) {
      return [];
    }
    
    await this.ensureTableExists(collection);
    
    try {
      // Build parameterized query for multiple inserts
      const values = documents.map((_, index) => `($${index + 1})`).join(', ');
      const query = `
        INSERT INTO ${this.escapeIdentifier(collection)} (data) 
        VALUES ${values} 
        RETURNING id, data, created_at, updated_at
      `;
      
      const result = await this.executeRawQuery(query, documents);
      
      return result.rows.map(row => ({
        ...row.data,
        _id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to insert documents into ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find documents by query
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @param options - Query options
   * @returns Array of matching documents
   */
  public async find(
    collection: string,
    query: any,
    options?: PostgresQueryOptions
  ): Promise<any[]> {
    await this.ensureTableExists(collection);
    
    try {
      // Convert MongoDB-style query to PostgreSQL JSON query
      const { whereClause, params } = this.buildWhereClause(query);
      
      let sqlQuery = `
        SELECT id, data, created_at, updated_at 
        FROM ${this.escapeIdentifier(collection)}
      `;
      
      if (whereClause) {
        sqlQuery += ` WHERE ${whereClause}`;
      }
      
      // Apply sorting
      if (options?.sort) {
        const orderClauses = Object.entries(options.sort).map(([field, direction]) => {
          const dir = direction === -1 ? 'DESC' : 'ASC';
          return field === '_id' 
            ? `id ${dir}` 
            : `data->>'${field}' ${dir}`;
        });
        
        if (orderClauses.length > 0) {
          sqlQuery += ` ORDER BY ${orderClauses.join(', ')}`;
        }
      }
      
      // Apply limit and offset
      if (options?.limit) {
        sqlQuery += ` LIMIT ${parseInt(options.limit.toString(), 10)}`;
      }
      
      if (options?.skip) {
        sqlQuery += ` OFFSET ${parseInt(options.skip.toString(), 10)}`;
      }
      
      const result = await this.executeRawQuery(sqlQuery, params);
      
      return result.rows.map((row: any) => ({
        ...row.data,
        _id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to find documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find a single document by query
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @param options - Query options
   * @returns The matching document or null
   */
  public async findOne(
    collection: string,
    query: any,
    options?: PostgresQueryOptions
  ): Promise<any | null> {
    await this.ensureTableExists(collection);
    
    try {
      // Reuse find method with limit 1
      const results = await this.find(
        collection,
        query,
        { 
          ...options,
          limit: 1
        }
      );
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new Error(`Failed to find document in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Find a document by ID
   * 
   * @param collection - The table name
   * @param id - The document ID
   * @returns The matching document or null
   */
  public async findById(
    collection: string,
    id: string | number
  ): Promise<any | null> {
    await this.ensureTableExists(collection);
    
    try {
      // Simple ID lookup
      const query = `
        SELECT id, data, created_at, updated_at 
        FROM ${this.escapeIdentifier(collection)} 
        WHERE id = $1
        LIMIT 1
      `;
      
      const result = await this.executeRawQuery(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        ...row.data,
        _id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      throw new Error(`Failed to find document by ID in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Update a single document
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @param update - The update operations
   * @returns The updated document
   */
  public async updateOne(collection: string, query: any, update: any): Promise<any> {
    await this.ensureTableExists(collection);
    
    try {
      // Start a transaction
      const client = await this.getClient();
      
      try {
        await client.query('BEGIN');
        
        // Find the document to update
        const { whereClause, params } = this.buildWhereClause(query);
        
        const findQuery = `
          SELECT id, data 
          FROM ${this.escapeIdentifier(collection)} 
          WHERE ${whereClause || 'TRUE'}
          LIMIT 1
          FOR UPDATE
        `;
        
        const findResult = await client.query(findQuery, params);
        
        if (findResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }
        
        const row = findResult.rows[0];
        const currentData = row.data;
        let newData: any;
        
        // Handle different update operations
        if (update.$set) {
          // $set operation
          newData = { ...currentData, ...update.$set };
        } else if (update.$push) {
          // $push operation (for arrays)
          newData = { ...currentData };
          Object.entries(update.$push).forEach(([field, value]) => {
            if (!Array.isArray(newData[field])) {
              newData[field] = [];
            }
            newData[field].push(value);
          });
        } else if (update.$pull) {
          // $pull operation (remove from arrays)
          newData = { ...currentData };
          Object.entries(update.$pull).forEach(([field, value]) => {
            if (Array.isArray(newData[field])) {
              newData[field] = newData[field].filter((item: any) => 
                JSON.stringify(item) !== JSON.stringify(value)
              );
            }
          });
        } else {
          // Direct update
          newData = { ...currentData, ...update };
        }
        
        // Update the document
        const updateQuery = `
          UPDATE ${this.escapeIdentifier(collection)}
          SET data = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, data, created_at, updated_at
        `;
        
        const updateResult = await client.query(updateQuery, [newData, row.id]);
        await client.query('COMMIT');
        
        const updatedRow = updateResult.rows[0];
        return {
          ...updatedRow.data,
          _id: updatedRow.id,
          created_at: updatedRow.created_at,
          updated_at: updatedRow.updated_at
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to update document in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Update multiple documents
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @param update - The update operations
   * @returns The result with modifiedCount
   */
  public async updateMany(collection: string, query: any, update: any): Promise<any> {
    await this.ensureTableExists(collection);
    
    try {
      const client = await this.getClient();
      
      try {
        await client.query('BEGIN');
        
        // Find all documents to update
        const { whereClause, params } = this.buildWhereClause(query);
        
        const findQuery = `
          SELECT id, data 
          FROM ${this.escapeIdentifier(collection)} 
          WHERE ${whereClause || 'TRUE'}
          FOR UPDATE
        `;
        
        const findResult = await client.query(findQuery, params);
        
        if (findResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return { matchedCount: 0, modifiedCount: 0 };
        }
        
        let modifiedCount = 0;
        
        // Process each document
        for (const row of findResult.rows) {
          const currentData = (row as any).data;
          let newData: any;
          
          // Handle different update operations (same as updateOne)
          if (update.$set) {
            newData = { ...currentData, ...update.$set };
          } else if (update.$push) {
            newData = { ...currentData };
            Object.entries(update.$push).forEach(([field, value]) => {
              if (!Array.isArray(newData[field])) {
                newData[field] = [];
              }
              newData[field].push(value);
            });
          } else if (update.$pull) {
            newData = { ...currentData };
            Object.entries(update.$pull).forEach(([field, value]) => {
              if (Array.isArray(newData[field])) {
                newData[field] = newData[field].filter((item: any) => 
                  JSON.stringify(item) !== JSON.stringify(value)
                );
              }
            });
          } else {
            newData = { ...currentData, ...update };
          }
          
          // Update the document
          const updateQuery = `
            UPDATE ${this.escapeIdentifier(collection)}
            SET data = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `;
          
          const updateResult = await client.query(updateQuery, [newData, (row as any).id]);
          modifiedCount += updateResult.rowCount ?? 0;
        }
        
        await client.query('COMMIT');
        
        return {
          matchedCount: findResult.rows.length,
          modifiedCount: modifiedCount
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to update documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a single document
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @returns true if deleted, false if not found
   */
  public async deleteOne(collection: string, query: any): Promise<boolean> {
    await this.ensureTableExists(collection);
    
    try {
      // Convert the query
      const { whereClause, params } = this.buildWhereClause(query);
      
      // PostgreSQL doesn't support LIMIT in DELETE, so we need a workaround
      const subQuery = `
        DELETE FROM ${this.escapeIdentifier(collection)}
        WHERE id IN (
          SELECT id FROM ${this.escapeIdentifier(collection)}
          WHERE ${whereClause || 'TRUE'} 
          LIMIT 1
        )
      `;
      
      const result = await this.executeRawQuery(subQuery, params);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      throw new Error(`Failed to delete document from ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete multiple documents
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @returns The number of deleted documents
   */
  public async deleteMany(collection: string, query: any): Promise<number> {
    await this.ensureTableExists(collection);
    
    try {
      // Convert the query
      const { whereClause, params } = this.buildWhereClause(query);
      
      // Delete the documents
      const deleteQuery = `
        DELETE FROM ${this.escapeIdentifier(collection)}
        WHERE ${whereClause || 'TRUE'}
      `;
      
      const result = await this.executeRawQuery(deleteQuery, params);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new Error(`Failed to delete documents from ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Count documents
   * 
   * @param collection - The table name
   * @param query - The query to filter documents
   * @returns The number of matching documents
   */
  public async count(collection: string, query?: any): Promise<number> {
    await this.ensureTableExists(collection);
    
    try {
      // Convert the query
      const { whereClause, params } = this.buildWhereClause(query || {});
      
      // Count the documents
      const countQuery = `
        SELECT COUNT(*) as count
        FROM ${this.escapeIdentifier(collection)}
        ${whereClause ? `WHERE ${whereClause}` : ''}
      `;
      
      const result = await this.executeRawQuery(countQuery, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new Error(`Failed to count documents in ${collection}: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a raw SQL query
   * 
   * @param query - The SQL query to execute
   * @param params - Query parameters
   * @returns The query result
   */
  public async executeRawQuery(query: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    try {
      return await this.pool.query(query, params);
    } catch (error) {
      throw new Error(`Failed to execute SQL query: ${(error as Error).message}`);
    }
  }

  /**
   * Get a client from the pool
   * 
   * @returns A PostgreSQL client
   */
  private async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    try {
      return await this.pool.connect();
    } catch (error) {
      throw new Error(`Failed to get client from pool: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a table exists
   * 
   * @param name - The table name
   * @returns true if the table exists, false otherwise
   */
  private async checkTableExists(name: string): Promise<boolean> {
    if (this.tablesCreated.has(name)) {
      return true;
    }
    
    try {
      const result = await this.executeRawQuery(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [name]);
      
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ensure a table exists, creating it if necessary
   * 
   * @param name - The table name
   */
  private async ensureTableExists(name: string): Promise<void> {
    if (!await this.checkTableExists(name)) {
      await this.createCollection(name);
    }
  }

  /**
   * Build a WHERE clause from a MongoDB-style query
   * 
   * @param query - The MongoDB-style query
   * @returns The WHERE clause and parameters
   */
  private buildWhereClause(query: any): { whereClause: string; params: any[] } {
    if (!query || Object.keys(query).length === 0) {
      return { whereClause: '', params: [] };
    }
    
    const clauses: string[] = [];
    const params: any[] = [];
    
    Object.entries(query).forEach(([key, value]) => {
      if (key === '_id') {
        // Special case for _id
        params.push(value);
        clauses.push(`id = $${params.length}`);
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like $eq, $gt, $lt, etc.
        Object.entries(value as object).forEach(([op, opValue]) => {
          switch (op) {
            case '$eq':
              params.push(opValue);
              clauses.push(`data->>'${key}' = $${params.length}`);
              break;
            case '$gt':
              params.push(opValue);
              clauses.push(`(data->>'${key}')::numeric > $${params.length}`);
              break;
            case '$gte':
              params.push(opValue);
              clauses.push(`(data->>'${key}')::numeric >= $${params.length}`);
              break;
            case '$lt':
              params.push(opValue);
              clauses.push(`(data->>'${key}')::numeric < $${params.length}`);
              break;
            case '$lte':
              params.push(opValue);
              clauses.push(`(data->>'${key}')::numeric <= $${params.length}`);
              break;
            case '$in':
              if (Array.isArray(opValue)) {
                const placeholders = opValue.map((_, i) => `$${params.length + i + 1}`).join(', ');
                clauses.push(`data->>'${key}' IN (${placeholders})`);
                params.push(...opValue);
              }
              break;
            default:
              // Default equality
              params.push(value);
              clauses.push(`data @> jsonb_build_object('${key}', $${params.length})`);
              break;
          }
        });
      } else {
        // Simple equality
        params.push(value);
        clauses.push(`data @> jsonb_build_object('${key}', $${params.length}::jsonb)`);
      }
    });
    
    return {
      whereClause: clauses.join(' AND '),
      params
    };
  }

  /**
   * Escape a SQL identifier
   * 
   * @param identifier - The identifier to escape
   * @returns The escaped identifier
   */
  private escapeIdentifier(identifier: string): string {
    // Simple implementation, for robust solution should use pg's built-in escaping
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Get connection options from configuration
   * 
   * @returns PostgreSQL connection options
   */
  private getConnectionOptionsFromConfig(): PostgresConnectionOptions {
    const dbConfig = this.config.get('databases.postgresql', {}) as Record<string, any>;
    
    return {
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      user: dbConfig.user || dbConfig.username || 'postgres',
      password: String(dbConfig.password || 'postgres'),
      database: dbConfig.database || 'benchmark',
      ssl: dbConfig.ssl || false,
      connectionTimeoutMillis: dbConfig.connectionTimeout || 30000,
      idleTimeoutMillis: dbConfig.idleTimeout || 60000,
      poolSize: dbConfig.poolSize || 10,
      uri: dbConfig.uri || '',
    };
  }

  /**
   * Check if a table exists
   * 
   * @param name - The table name
   * @returns true if the table exists, false otherwise
   */
  public async collectionExists(name: string): Promise<boolean> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }
    
    try {
      const result = await this.pool.query(
        'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)',
        [name]
      );
      
      return result.rows[0].exists;
    } catch (error) {
      throw new Error(`Failed to check if table ${name} exists: ${(error as Error).message}`);
    }
  }

  /**
   * Convert a string ID to a database-specific object ID
   * PostgreSQL doesn't have a specific object ID type like MongoDB,
   * so this method simply returns the ID as is.
   * 
   * @param id - The ID to convert
   * @returns The ID unchanged
   */
  public objectId(id: string): string {
    return id;
  }
} 