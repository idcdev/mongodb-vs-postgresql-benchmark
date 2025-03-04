/**
 * PostgreSQL Adapter Tests
 */

import { Pool, QueryResult } from 'pg';
import { PostgreSQLAdapter, PostgresConnectionOptions } from './postgresql-adapter';
import { DatabaseType } from '../../domain/interfaces';
import { ConfigProvider } from '../../domain/interfaces';

// Mock the pg module
jest.mock('pg');

describe('PostgreSQLAdapter', () => {
  // Mock ConfigProvider
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

  // Mock pg classes and methods
  const mockQueryResult: Partial<QueryResult> = {
    rows: [],
    rowCount: 0,
    command: '',
    oid: 0,
    fields: [],
  };

  const mockClient = {
    query: jest.fn().mockResolvedValue(mockQueryResult),
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn().mockResolvedValue(mockQueryResult),
    end: jest.fn().mockResolvedValue(undefined),
    ended: false,
  };

  // Setup before each test
  let adapter: PostgreSQLAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    (mockConfig.get as jest.Mock).mockImplementation((key, defaultValue) => {
      if (key === 'databases.postgresql') {
        return {
          host: 'localhost',
          port: 5432,
          user: 'testuser',
          password: 'testpass',
          database: 'testdb',
          ssl: false,
          poolSize: 10,
          connectionTimeout: 30000,
          idleTimeout: 60000,
          uri: '',
        };
      }
      return defaultValue;
    });

    // Setup pg mock
    (Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool as unknown as Pool);
    
    // Create new adapter instance
    adapter = new PostgreSQLAdapter(mockConfig);
  });

  describe('constructor', () => {
    it('should create a new instance with the provided config', () => {
      expect(adapter).toBeInstanceOf(PostgreSQLAdapter);
    });
  });

  describe('getType', () => {
    it('should return PostgreSQL database type', () => {
      expect(adapter.getType()).toBe(DatabaseType.POSTGRESQL);
    });
  });

  describe('connect', () => {
    it('should connect to PostgreSQL using config options', async () => {
      await adapter.connect();
      
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          user: 'testuser',
          password: 'testpass',
          database: 'testdb',
          ssl: false,
          max: 10,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 60000,
        })
      );
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should connect to PostgreSQL using provided options', async () => {
      const options: PostgresConnectionOptions = {
        host: 'custom-host',
        port: 5433,
        user: 'custom',
        password: 'custom',
        database: 'custom-db',
        ssl: true,
        poolSize: 20,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        uri: '',
      };

      await adapter.connect(options);
      
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 5433,
          user: 'custom',
          password: 'custom',
          database: 'custom-db',
          ssl: true,
          max: 20,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 10000,
        })
      );
    });

    it('should handle connection errors', async () => {
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(adapter.connect()).rejects.toThrow('Failed to connect to PostgreSQL: Connection failed');
    });

    it('should not reconnect if already connected', async () => {
      // First connect
      await adapter.connect();
      const poolCallCount = (Pool as jest.MockedClass<typeof Pool>).mock.instances.length;
      
      // Mock isConnected to return true
      jest.spyOn(adapter, 'isConnected').mockReturnValueOnce(true);
      
      // Try to connect again
      await adapter.connect();
      
      // Should not create a new pool
      expect((Pool as jest.MockedClass<typeof Pool>).mock.instances.length).toBe(poolCallCount);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from PostgreSQL', async () => {
      // Connect first
      await adapter.connect();
      
      // Then disconnect
      await adapter.disconnect();
      
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      // Connect first
      await adapter.connect();
      
      // Mock error when closing
      mockPool.end.mockRejectedValueOnce(new Error('Close failed'));
      
      await expect(adapter.disconnect()).rejects.toThrow('Failed to disconnect from PostgreSQL: Close failed');
    });

    it('should do nothing if not connected', async () => {
      await adapter.disconnect();
      expect(mockPool.end).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      await adapter.connect();
      mockPool.ended = false;
      expect(adapter.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(adapter.isConnected()).toBe(false);
    });

    it('should return false when pool has ended', async () => {
      await adapter.connect();
      mockPool.ended = true;
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Table operations', () => {
    beforeEach(async () => {
      // Connect before each test
      await adapter.connect();
    });

    describe('createCollection', () => {
      it('should create a table with default schema', async () => {
        // Mock table doesn't exist
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ exists: false }]
        });
        
        await adapter.createCollection('test_table');
        
        // Just check at least one of the calls contains the CREATE TABLE statement
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE IF NOT EXISTS'),
          expect.anything()
        );
      });

      it('should create a table with custom schema', async () => {
        // Mock table doesn't exist
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ exists: false }]
        });
        
        const customSchema = {
          id: 'UUID PRIMARY KEY',
          name: 'TEXT NOT NULL',
          score: 'INTEGER DEFAULT 0'
        };
        
        await adapter.createCollection('test_table', { schema: customSchema });
        
        // Check if the query contains the expected schema parts
        const calls = mockPool.query.mock.calls;
        const createTableCall = calls.find(call => 
          call[0] && typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
        );
        
        expect(createTableCall).toBeDefined();
        expect(createTableCall[0]).toContain('UUID PRIMARY KEY');
        expect(createTableCall[0]).toContain('TEXT NOT NULL');
      });

      it('should skip creation if table already exists', async () => {
        // Mock table exists
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ exists: true }]
        });
        
        await adapter.createCollection('existing_table');
        
        // Should only check existence and not create
        expect(mockPool.query).toHaveBeenCalledTimes(1);
        expect(mockPool.query).not.toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE'),
          expect.anything()
        );
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.createCollection('test')).rejects.toThrow('Not connected to PostgreSQL');
      });
    });

    describe('dropCollection', () => {
      it('should drop an existing table', async () => {
        // Mock table exists
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ exists: true }]
        });
        
        const result = await adapter.dropCollection('test_table');
        
        // Check if DROP TABLE was called
        const calls = mockPool.query.mock.calls;
        const dropTableCall = calls.find(call => 
          call[0] && typeof call[0] === 'string' && call[0].includes('DROP TABLE')
        );
        
        expect(dropTableCall).toBeDefined();
        expect(result).toBe(true);
      });

      it('should return false if table does not exist', async () => {
        // Mock table doesn't exist
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ exists: false }]
        });
        
        const result = await adapter.dropCollection('nonexistent_table');
        
        expect(mockPool.query).not.toHaveBeenCalledWith(
          expect.stringContaining('DROP TABLE'),
          expect.anything()
        );
        expect(result).toBe(false);
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.dropCollection('test')).rejects.toThrow('Not connected to PostgreSQL');
      });
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      // Connect before each test
      await adapter.connect();
      
      // Mock table exists
      mockPool.query.mockResolvedValueOnce({
        ...mockQueryResult,
        rows: [{ exists: true }]
      });
    });

    describe('insertOne', () => {
      it('should insert a document', async () => {
        const doc = { name: 'Test Document' };
        
        // Mock insertion result
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{
            id: 1,
            data: doc,
            created_at: new Date(),
            updated_at: new Date()
          }]
        });
        
        const result = await adapter.insertOne('test_table', doc);
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO'),
          [doc]
        );
        expect(result).toMatchObject({
          ...doc,
          _id: 1,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        });
      });

      it('should handle insert errors', async () => {
        mockPool.query.mockRejectedValueOnce(new Error('Insert failed'));
        
        await expect(adapter.insertOne('test_table', {})).rejects.toThrow(
          /Failed to insert document into test_table:/
        );
      });
    });

    describe('insertMany', () => {
      it('should insert multiple documents', async () => {
        const docs = [{ name: 'Doc 1' }, { name: 'Doc 2' }];
        
        // Mock insertion result
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [
            { id: 1, data: docs[0], created_at: new Date(), updated_at: new Date() },
            { id: 2, data: docs[1], created_at: new Date(), updated_at: new Date() }
          ]
        });
        
        const result = await adapter.insertMany('test_table', docs);
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO'),
          docs
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          ...docs[0],
          _id: 1,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        });
      });

      it('should return empty array if no documents to insert', async () => {
        const result = await adapter.insertMany('test_table', []);
        expect(mockPool.query).not.toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO'),
          expect.anything()
        );
        expect(result).toEqual([]);
      });
    });

    describe('find', () => {
      it('should find documents', async () => {
        const mockDocs = [
          { id: 1, data: { name: 'Doc 1' }, created_at: new Date(), updated_at: new Date() },
          { id: 2, data: { name: 'Doc 2' }, created_at: new Date(), updated_at: new Date() }
        ];
        
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: mockDocs
        });
        
        const result = await adapter.find('test_table', { name: 'Doc' });
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          expect.anything()
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          name: 'Doc 1',
          _id: 1,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        });
      });

      it('should apply query options', async () => {
        await adapter.find('test_table', {}, {
          sort: { name: 1, _id: -1 },
          limit: 10,
          skip: 5
        });
        
        const calls = mockPool.query.mock.calls;
        const queryCall = calls.find(call => 
          call[0] && typeof call[0] === 'string' && 
          call[0].includes('SELECT') && 
          call[0].includes('ORDER BY')
        );
        
        expect(queryCall).toBeDefined();
        expect(queryCall[0]).toContain('LIMIT');
        expect(queryCall[0]).toContain('OFFSET');
      });
    });

    describe('findOne', () => {
      it('should find a single document', async () => {
        const mockDoc = { id: 1, data: { name: 'Doc 1' }, created_at: new Date(), updated_at: new Date() };
        
        // Mock for find method (because findOne uses find internally)
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [mockDoc]
        });
        
        const result = await adapter.findOne('test_table', { _id: 1 });
        
        expect(mockPool.query).toHaveBeenCalled();
        expect(result).toMatchObject({
          name: 'Doc 1',
          _id: 1,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        });
      });

      it('should return null if document not found', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: []
        });
        
        const result = await adapter.findOne('test_table', { _id: 'non-existent' });
        
        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find a document by ID', async () => {
        const mockDoc = { id: 1, data: { name: 'Doc 1' }, created_at: new Date(), updated_at: new Date() };
        
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [mockDoc]
        });
        
        const result = await adapter.findById('test_table', 1);
        
        const calls = mockPool.query.mock.calls;
        const queryCall = calls.find(call => 
          call[0] && typeof call[0] === 'string' && 
          call[0].includes('SELECT') && 
          call[0].includes('WHERE id = $1')
        );
        
        expect(queryCall).toBeDefined();
        expect(queryCall[1]).toEqual([1]);
        
        expect(result).toMatchObject({
          name: 'Doc 1',
          _id: 1,
          created_at: expect.any(Date),
          updated_at: expect.any(Date)
        });
      });

      it('should return null if document not found', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: []
        });
        
        const result = await adapter.findById('test_table', 999);
        
        expect(result).toBeNull();
      });
    });

    describe('deleteOne', () => {
      it('should delete a document', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rowCount: 1
        });
        
        const result = await adapter.deleteOne('test_table', { _id: 1 });
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM'),
          expect.anything()
        );
        expect(result).toBe(true);
      });

      it('should return false if no document deleted', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rowCount: 0
        });
        
        const result = await adapter.deleteOne('test_table', { _id: 'non-existent' });
        
        expect(result).toBe(false);
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple documents', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rowCount: 5
        });
        
        const result = await adapter.deleteMany('test_table', { status: 'completed' });
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM'),
          expect.anything()
        );
        expect(result).toBe(5);
      });
    });

    describe('count', () => {
      it('should count documents', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ count: '10' }]
        });
        
        const result = await adapter.count('test_table', { active: true });
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT COUNT'),
          expect.anything()
        );
        expect(result).toBe(10);
      });

      it('should count all documents if no query provided', async () => {
        mockPool.query.mockResolvedValueOnce({
          ...mockQueryResult,
          rows: [{ count: '20' }]
        });
        
        const result = await adapter.count('test_table');
        
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT COUNT'),
          expect.anything()
        );
        expect(result).toBe(20);
      });
    });

    describe('executeRawQuery', () => {
      it('should execute a raw SQL query', async () => {
        const expectedQuery = 'SELECT * FROM test_table';
        const mockResponse = {
          ...mockQueryResult,
          rows: [{ result: 'success' }]
        };
        
        mockPool.query.mockResolvedValueOnce(mockResponse);
        
        await adapter.executeRawQuery(expectedQuery);
        
        expect(mockPool.query).toHaveBeenCalledWith(expectedQuery, undefined);
      });

      it('should execute a parameterized query', async () => {
        const query = 'SELECT * FROM test_table WHERE id = $1';
        const params = [1];
        
        await adapter.executeRawQuery(query, params);
        
        expect(mockPool.query).toHaveBeenCalledWith(query, params);
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.executeRawQuery('SELECT 1')).rejects.toThrow('Not connected to PostgreSQL');
      });
    });
  });
}); 