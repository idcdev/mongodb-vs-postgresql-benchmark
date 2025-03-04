import { ConfigFactory } from './config-factory';
import { DefaultConfigProvider } from './default-config-provider';

// Mock the DefaultConfigProvider
jest.mock('./default-config-provider');

describe('ConfigFactory', () => {
  // Save the original process.env
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset the mocks
    jest.clearAllMocks();
    // Reset the singleton
    ConfigFactory.reset();
    
    // Mock implementation for DefaultConfigProvider
    (DefaultConfigProvider as jest.Mock).mockImplementation(() => {
      return {
        loadFile: jest.fn().mockResolvedValue(undefined),
        loadEnvironment: jest.fn().mockReturnThis(),
        getAll: jest.fn().mockReturnValue({}),
        get: jest.fn()
      };
    });

    // Restore process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore process.env after all tests
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should create a new instance if none exists', () => {
      const instance = ConfigFactory.getInstance();
      
      expect(DefaultConfigProvider).toHaveBeenCalledTimes(1);
      expect(instance).toBeDefined();
    });

    it('should return the existing instance if already created', () => {
      const firstInstance = ConfigFactory.getInstance();
      const secondInstance = ConfigFactory.getInstance();
      
      expect(DefaultConfigProvider).toHaveBeenCalledTimes(1);
      expect(firstInstance).toBe(secondInstance);
    });
  });

  describe('reset', () => {
    it('should reset the singleton instance', () => {
      const firstInstance = ConfigFactory.getInstance();
      ConfigFactory.reset();
      const secondInstance = ConfigFactory.getInstance();
      
      expect(DefaultConfigProvider).toHaveBeenCalledTimes(2);
      expect(firstInstance).not.toBe(secondInstance);
    });

    it('should return the ConfigFactory class for chaining', () => {
      const result = ConfigFactory.reset();
      expect(result).toBe(ConfigFactory);
    });
  });

  describe('createConfigProvider', () => {
    it('should create a new provider with default settings', () => {
      const provider = ConfigFactory.createConfigProvider();
      
      expect(DefaultConfigProvider).toHaveBeenCalledTimes(1);
      expect(provider).toBeDefined();
    });

    it('should attempt to load config files', () => {
      const provider = ConfigFactory.createConfigProvider();
      
      // Using a setTimeout to allow the promise chain to resolve
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(provider.loadFile).toHaveBeenCalled();
          resolve();
        }, 10);
      });
    });

    it('should attempt to load environment variables', () => {
      const provider = ConfigFactory.createConfigProvider();
      
      // Using a setTimeout to allow the promise chain to resolve
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(provider.loadEnvironment).toHaveBeenCalledWith('MONGO_X_PG');
          resolve();
        }, 10);
      });
    });

    it('should try to load config files for the current NODE_ENV', () => {
      process.env.NODE_ENV = 'test';
      const provider = ConfigFactory.createConfigProvider();
      
      // Using a setTimeout to allow the promise chain to resolve
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(provider.loadFile).toHaveBeenCalledWith(
            expect.stringContaining('test.config.json')
          );
          resolve();
        }, 10);
      });
    });
  });

  describe('loadConfigFiles', () => {
    it('should handle file not found errors gracefully', () => {
      const provider = {
        loadFile: jest.fn().mockRejectedValue(new Error('ENOENT: file not found'))
      };
      
      // Use private method through reflection
      const loadConfigFiles = (ConfigFactory as any).loadConfigFiles.bind(ConfigFactory);
      
      return expect(loadConfigFiles(provider)).resolves.toBeUndefined();
    });

    it('should log other errors but continue loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const provider = {
        loadFile: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('Permission denied'))
          .mockResolvedValueOnce(undefined)
      };
      
      // Use private method through reflection
      const loadConfigFiles = (ConfigFactory as any).loadConfigFiles.bind(ConfigFactory);
      
      return loadConfigFiles(provider).then(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error loading config'),
          expect.any(Error)
        );
        expect(provider.loadFile).toHaveBeenCalledTimes(3);
        consoleSpy.mockRestore();
      });
    });
  });
}); 