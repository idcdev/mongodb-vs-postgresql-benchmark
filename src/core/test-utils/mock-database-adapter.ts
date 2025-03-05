/**
 * Mock Database Adapter Utilities
 * 
 * This file provides utility functions for creating mock database adapters
 * that can be used in tests.
 */

import { jest } from '@jest/globals';
import { 
  DatabaseAdapter, 
  DatabaseType, 
  ConnectionOptions, 
  QueryOptions 
} from '../domain/interfaces/database-adapter.interface';

/**
 * Create a mock database adapter for testing
 * 
 * @param type The database type for this adapter
 * @returns A mocked database adapter
 */
export function createMockDatabaseAdapter(type: DatabaseType = DatabaseType.MONGODB): jest.Mocked<DatabaseAdapter> {
  const adapter: Partial<DatabaseAdapter> = {
    getType: jest.fn().mockReturnValue(type),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    createCollection: jest.fn().mockResolvedValue(undefined),
    dropCollection: jest.fn().mockResolvedValue(true),
    insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id-123' }),
    insertMany: jest.fn().mockResolvedValue([{ id: 'batch-1' }, { id: 'batch-2' }]),
    find: jest.fn().mockResolvedValue([{ id: 'mock-id-123', username: 'testuser' }]),
    findOne: jest.fn().mockResolvedValue({ id: 'mock-id-123', username: 'testuser' }),
    findById: jest.fn().mockResolvedValue({ id: 'mock-id-123', username: 'testuser' }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
    deleteOne: jest.fn().mockResolvedValue(true),
    deleteMany: jest.fn().mockResolvedValue(5),
    count: jest.fn().mockResolvedValue(10),
    executeRawQuery: jest.fn().mockResolvedValue({}),
    collectionExists: jest.fn().mockResolvedValue(false),
    objectId: jest.fn().mockImplementation((id: string) => id)
  };
  
  return adapter as jest.Mocked<DatabaseAdapter>;
}

/**
 * Create default benchmark options for testing
 * 
 * @returns Default benchmark options suitable for testing
 */
export function createDefaultBenchmarkOptions() {
  return {
    size: 'small',
    iterations: 2,
    setupEnvironment: true,
    cleanupEnvironment: true,
    saveResults: false,
    verbose: false
  };
} 