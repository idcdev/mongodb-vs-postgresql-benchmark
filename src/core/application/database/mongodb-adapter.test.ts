/**
 * MongoDB Adapter Tests
 */

import { MongoClient } from 'mongodb';
import { MongoDBAdapter, MongoConnectionOptions } from './mongodb-adapter';
import { DatabaseType } from '../../domain/interfaces';
import { ConfigProvider } from '../../domain/interfaces';

// Mock the MongoDB client and related classes
jest.mock('mongodb');

describe('MongoDBAdapter', () => {
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

  // Mock MongoDB classes and methods
  const mockCollection = {
    insertOne: jest.fn(),
    insertMany: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCollectionCursor = {
    toArray: jest.fn(),
  };

  const mockDb = {
    collection: jest.fn().mockReturnValue(mockCollection),
    createCollection: jest.fn(),
    dropCollection: jest.fn(),
    listCollections: jest.fn().mockReturnValue({
      toArray: jest.fn(),
    }),
    command: jest.fn(),
  };

  const mockMongoClient = {
    connect: jest.fn(),
    close: jest.fn(),
    db: jest.fn().mockReturnValue(mockDb),
  };

  // Setup before each test
  let adapter: MongoDBAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    (mockConfig.get as jest.Mock).mockImplementation((key, defaultValue) => {
      if (key === 'databases.mongodb') {
        return {
          host: 'localhost',
          port: 27017,
          username: 'testuser',
          password: 'testpass',
          database: 'testdb',
          authSource: 'admin',
          poolSize: 10,
          connectionTimeout: 30000,
          idleTimeout: 60000,
        };
      }
      return defaultValue;
    });

    // Setup MongoDB mock
    (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(() => mockMongoClient as unknown as MongoClient);
    
    // Mock cursor for find method
    mockCollection.find.mockReturnValue(mockCollectionCursor);
    mockCollectionCursor.toArray.mockResolvedValue([]);

    // Create new adapter instance
    adapter = new MongoDBAdapter(mockConfig);
  });

  describe('constructor', () => {
    it('should create a new instance with the provided config', () => {
      expect(adapter).toBeInstanceOf(MongoDBAdapter);
    });
  });

  describe('getType', () => {
    it('should return MongoDB database type', () => {
      expect(adapter.getType()).toBe(DatabaseType.MONGODB);
    });
  });

  describe('connect', () => {
    it('should connect to MongoDB using config options', async () => {
      await adapter.connect();
      
      expect(MongoClient).toHaveBeenCalledWith(
        expect.stringContaining('mongodb://testuser:testpass@localhost:27017/testdb'),
        expect.objectContaining({
          maxPoolSize: 10,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 60000
        })
      );
      expect(mockMongoClient.connect).toHaveBeenCalled();
      expect(mockMongoClient.db).toHaveBeenCalledWith('testdb');
    });

    it('should connect to MongoDB using provided options', async () => {
      const options: MongoConnectionOptions = {
        uri: 'mongodb://custom:custom@custom-host:12345/custom-db',
        poolSize: 20,
        connectionTimeout: 5000,
        idleTimeout: 10000,
      };

      await adapter.connect(options);
      
      expect(MongoClient).toHaveBeenCalledWith(
        'mongodb://custom:custom@custom-host:12345/custom-db',
        expect.objectContaining({
          maxPoolSize: 20,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000,
        })
      );
    });

    it('should handle connection errors', async () => {
      mockMongoClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(adapter.connect()).rejects.toThrow('Failed to connect to MongoDB: Connection failed');
    });

    it('should not reconnect if already connected', async () => {
      // First connect
      await adapter.connect();
      const clientCallCount = (MongoClient as jest.MockedClass<typeof MongoClient>).mock.instances.length;
      
      // Mock isConnected to return true
      jest.spyOn(adapter, 'isConnected').mockReturnValueOnce(true);
      
      // Try to connect again
      await adapter.connect();
      
      // Should not create a new client
      expect((MongoClient as jest.MockedClass<typeof MongoClient>).mock.instances.length).toBe(clientCallCount);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB', async () => {
      // Connect first
      await adapter.connect();
      
      // Then disconnect
      await adapter.disconnect();
      
      expect(mockMongoClient.close).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      // Connect first
      await adapter.connect();
      
      // Mock error when closing
      mockMongoClient.close.mockRejectedValueOnce(new Error('Close failed'));
      
      await expect(adapter.disconnect()).rejects.toThrow('Failed to disconnect from MongoDB: Close failed');
    });

    it('should do nothing if not connected', async () => {
      await adapter.disconnect();
      expect(mockMongoClient.close).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('Collection operations', () => {
    beforeEach(async () => {
      // Connect before each test
      await adapter.connect();
      
      // Reset collection mocks
      mockDb.listCollections().toArray.mockResolvedValue([{ name: 'testCollection' }]);
    });

    describe('createCollection', () => {
      it('should create a collection', async () => {
        mockDb.listCollections().toArray.mockResolvedValue([]);
        await adapter.createCollection('newCollection');
        expect(mockDb.createCollection).toHaveBeenCalledWith('newCollection', undefined);
      });

      it('should handle collection already exists error', async () => {
        const error = new Error('Collection already exists');
        mockDb.createCollection.mockRejectedValueOnce(error);
        
        await expect(adapter.createCollection('existingCollection')).resolves.not.toThrow();
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.createCollection('test')).rejects.toThrow('Not connected to MongoDB');
      });
    });

    describe('dropCollection', () => {
      it('should drop an existing collection', async () => {
        mockDb.listCollections().toArray.mockResolvedValue([{ name: 'testCollection' }]);
        const result = await adapter.dropCollection('testCollection');
        
        expect(mockDb.dropCollection).toHaveBeenCalledWith('testCollection');
        expect(result).toBe(true);
      });

      it('should return false if collection does not exist', async () => {
        mockDb.listCollections().toArray.mockResolvedValue([]);
        const result = await adapter.dropCollection('nonExistentCollection');
        
        expect(mockDb.dropCollection).not.toHaveBeenCalled();
        expect(result).toBe(false);
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.dropCollection('test')).rejects.toThrow('Not connected to MongoDB');
      });
    });
  });

  describe('CRUD operations', () => {
    beforeEach(async () => {
      // Connect before each test
      await adapter.connect();
      
      // Mock collection exists
      mockDb.listCollections().toArray.mockResolvedValue([{ name: 'testCollection' }]);
    });

    describe('insertOne', () => {
      it('should insert a document', async () => {
        const doc = { name: 'Test Document' };
        const mockResult = { insertedId: 'test-id-123' };
        
        mockCollection.insertOne.mockResolvedValueOnce(mockResult);
        
        const result = await adapter.insertOne('testCollection', doc);
        
        expect(mockCollection.insertOne).toHaveBeenCalledWith(doc);
        expect(result).toEqual({ ...doc, _id: 'test-id-123' });
      });

      it('should handle insert errors', async () => {
        mockCollection.insertOne.mockRejectedValueOnce(new Error('Insert failed'));
        
        await expect(adapter.insertOne('testCollection', {})).rejects.toThrow(
          'Failed to insert document into testCollection: Insert failed'
        );
      });
    });

    describe('insertMany', () => {
      it('should insert multiple documents', async () => {
        const docs = [{ name: 'Doc 1' }, { name: 'Doc 2' }];
        const mockResult = { 
          insertedIds: { 0: 'id-1', 1: 'id-2' } 
        };
        
        mockCollection.insertMany.mockResolvedValueOnce(mockResult);
        
        const result = await adapter.insertMany('testCollection', docs);
        
        expect(mockCollection.insertMany).toHaveBeenCalledWith(docs);
        expect(result).toEqual([
          { name: 'Doc 1', _id: 'id-1' },
          { name: 'Doc 2', _id: 'id-2' }
        ]);
      });

      it('should return empty array if no documents to insert', async () => {
        const result = await adapter.insertMany('testCollection', []);
        expect(mockCollection.insertMany).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });

    describe('find', () => {
      it('should find documents', async () => {
        const mockDocs = [{ _id: 'id-1', name: 'Doc 1' }, { _id: 'id-2', name: 'Doc 2' }];
        mockCollectionCursor.toArray.mockResolvedValueOnce(mockDocs);
        
        const result = await adapter.find('testCollection', { name: 'Doc' });
        
        expect(mockCollection.find).toHaveBeenCalledWith({ name: 'Doc' }, expect.any(Object));
        expect(result).toEqual(mockDocs);
      });

      it('should apply query options', async () => {
        await adapter.find('testCollection', {}, {
          projection: { name: 1 },
          sort: { name: 1 },
          limit: 10,
          skip: 5,
          timeout: 1000
        });
        
        expect(mockCollection.find).toHaveBeenCalledWith({}, {
          projection: { name: 1 },
          sort: { name: 1 },
          limit: 10,
          skip: 5,
          timeoutMS: 1000
        });
      });
    });

    describe('findOne', () => {
      it('should find a single document', async () => {
        const mockDoc = { _id: 'id-1', name: 'Doc 1' };
        mockCollection.findOne.mockResolvedValueOnce(mockDoc);
        
        const result = await adapter.findOne('testCollection', { _id: 'id-1' });
        
        expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: 'id-1' }, expect.any(Object));
        expect(result).toEqual(mockDoc);
      });

      it('should return null if document not found', async () => {
        mockCollection.findOne.mockResolvedValueOnce(null);
        
        const result = await adapter.findOne('testCollection', { _id: 'non-existent' });
        
        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find a document by ID', async () => {
        const mockDoc = { _id: 'id-1', name: 'Doc 1' };
        mockCollection.findOne.mockResolvedValueOnce(mockDoc);
        
        const result = await adapter.findById('testCollection', 'id-1');
        
        expect(mockCollection.findOne).toHaveBeenCalledWith(expect.anything(), expect.anything());
        expect(result).toEqual(mockDoc);
      });

      it('should throw error for invalid ObjectId', async () => {
        // Mock ObjectId constructor to throw error
        const originalObjectId = require('mongodb').ObjectId;
        require('mongodb').ObjectId = function() {
          throw new Error('Invalid ObjectID');
        };
        
        await expect(adapter.findById('testCollection', 'invalid-id')).rejects.toThrow(
          'Invalid MongoDB ObjectId: invalid-id'
        );
        
        // Restore original ObjectId
        require('mongodb').ObjectId = originalObjectId;
      });
    });

    describe('updateOne', () => {
      it('should update a document', async () => {
        const mockResult = { 
          value: { _id: 'id-1', name: 'Updated Doc' } 
        };
        mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockResult);
        
        const result = await adapter.updateOne('testCollection', { _id: 'id-1' }, { name: 'Updated Doc' });
        
        expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'id-1' },
          { $set: { name: 'Updated Doc' } },
          { returnDocument: 'after' }
        );
        expect(result).toEqual({ _id: 'id-1', name: 'Updated Doc' });
      });

      it('should use MongoDB operators if provided', async () => {
        const mockResult = { 
          value: { _id: 'id-1', items: ['item1', 'item2'] } 
        };
        mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockResult);
        
        await adapter.updateOne('testCollection', { _id: 'id-1' }, { $push: { items: 'item2' } });
        
        expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
          { _id: 'id-1' },
          { $push: { items: 'item2' } },
          { returnDocument: 'after' }
        );
      });

      it('should handle null result', async () => {
        mockCollection.findOneAndUpdate.mockResolvedValueOnce({ value: null });
        
        const result = await adapter.updateOne('testCollection', { _id: 'non-existent' }, { name: 'Test' });
        
        expect(result).toBeNull();
      });
    });

    describe('updateMany', () => {
      it('should update multiple documents', async () => {
        const mockResult = { 
          matchedCount: 2,
          modifiedCount: 2,
          upsertedCount: 0,
          upsertedId: null
        };
        mockCollection.updateMany.mockResolvedValueOnce(mockResult);
        
        const result = await adapter.updateMany('testCollection', { active: true }, { status: 'updated' });
        
        expect(mockCollection.updateMany).toHaveBeenCalledWith(
          { active: true },
          { $set: { status: 'updated' } }
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteOne', () => {
      it('should delete a document', async () => {
        mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
        
        const result = await adapter.deleteOne('testCollection', { _id: 'id-1' });
        
        expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: 'id-1' });
        expect(result).toBe(true);
      });

      it('should return false if no document deleted', async () => {
        mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });
        
        const result = await adapter.deleteOne('testCollection', { _id: 'non-existent' });
        
        expect(result).toBe(false);
      });
    });

    describe('deleteMany', () => {
      it('should delete multiple documents', async () => {
        mockCollection.deleteMany.mockResolvedValueOnce({ deletedCount: 5 });
        
        const result = await adapter.deleteMany('testCollection', { active: false });
        
        expect(mockCollection.deleteMany).toHaveBeenCalledWith({ active: false });
        expect(result).toBe(5);
      });
    });

    describe('count', () => {
      it('should count documents', async () => {
        mockCollection.countDocuments.mockResolvedValueOnce(10);
        
        const result = await adapter.count('testCollection', { active: true });
        
        expect(mockCollection.countDocuments).toHaveBeenCalledWith({ active: true });
        expect(result).toBe(10);
      });

      it('should count all documents if no query provided', async () => {
        mockCollection.countDocuments.mockResolvedValueOnce(20);
        
        const result = await adapter.count('testCollection');
        
        expect(mockCollection.countDocuments).toHaveBeenCalledWith({});
        expect(result).toBe(20);
      });
    });

    describe('executeRawQuery', () => {
      it('should execute a raw MongoDB command', async () => {
        const command = { ping: 1 };
        const commandStr = JSON.stringify(command);
        const mockResponse = { ok: 1 };
        
        mockDb.command.mockResolvedValueOnce(mockResponse);
        
        const result = await adapter.executeRawQuery(commandStr);
        
        expect(mockDb.command).toHaveBeenCalledWith(command);
        expect(result).toEqual(mockResponse);
      });

      it('should throw error for invalid JSON', async () => {
        await expect(adapter.executeRawQuery('invalid json')).rejects.toThrow(
          /Failed to execute MongoDB command:.+JSON/
        );
      });

      it('should throw error if not connected', async () => {
        await adapter.disconnect();
        await expect(adapter.executeRawQuery('{}')).rejects.toThrow('Not connected to MongoDB');
      });
    });
  });
}); 