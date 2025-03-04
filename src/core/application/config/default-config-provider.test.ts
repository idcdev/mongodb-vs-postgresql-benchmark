import { DefaultConfigProvider } from './default-config-provider';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

// Mock path module
jest.mock('path', () => ({
  resolve: jest.fn((filePath) => filePath),
  extname: jest.fn(() => '.json'),
}));

describe('DefaultConfigProvider', () => {
  let configProvider: DefaultConfigProvider;

  beforeEach(() => {
    configProvider = new DefaultConfigProvider();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with empty config when no initial values provided', () => {
      expect(configProvider.getAll()).toEqual({});
    });

    it('should initialize with provided config values', () => {
      const initialValues = {
        foo: 'bar',
        nested: {
          value: 123
        }
      };
      configProvider = new DefaultConfigProvider(initialValues);
      expect(configProvider.getAll()).toEqual(initialValues);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      configProvider = new DefaultConfigProvider({
        db: {
          host: 'localhost',
          port: 27017
        },
        app: {
          name: 'test-app',
          version: '1.0.0'
        }
      });
    });

    it('should get a value by key', () => {
      expect(configProvider.get('app.name')).toBe('test-app');
    });

    it('should get a nested value by key', () => {
      expect(configProvider.get('db.port')).toBe(27017);
    });

    it('should return default value when key does not exist', () => {
      expect(configProvider.get('nonexistent', 'default')).toBe('default');
    });

    it('should throw an error when key does not exist and no default value provided', () => {
      expect(() => configProvider.get('nonexistent')).toThrow(/not found/);
    });
  });

  describe('has', () => {
    beforeEach(() => {
      configProvider = new DefaultConfigProvider({
        db: {
          host: 'localhost',
          port: 27017
        }
      });
    });

    it('should return true when key exists', () => {
      expect(configProvider.has('db.host')).toBe(true);
    });

    it('should return false when key does not exist', () => {
      expect(configProvider.has('nonexistent')).toBe(false);
    });
  });

  describe('set', () => {
    it('should set a value and return the provider instance', () => {
      const result = configProvider.set('app.name', 'test-app');
      
      expect(result).toBe(configProvider); // Returns self for chaining
      expect(configProvider.get('app.name')).toBe('test-app');
    });

    it('should override existing value', () => {
      configProvider.set('app.name', 'original');
      configProvider.set('app.name', 'updated');
      
      expect(configProvider.get('app.name')).toBe('updated');
    });

    it('should create nested objects when setting deep paths', () => {
      configProvider.set('db.connection.host', 'localhost');
      
      expect(configProvider.get('db.connection.host')).toBe('localhost');
      expect(configProvider.getAll()).toHaveProperty('db.connection.host');
    });
  });

  describe('loadFile', () => {
    beforeEach(() => {
      // Mock readFile to return a JSON string
      (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
        db: {
          host: 'db-server',
          port: 5432
        }
      }));
    });

    it('should load config from a JSON file', async () => {
      await configProvider.loadFile('config.json');
      
      expect(fs.promises.readFile).toHaveBeenCalledWith('config.json', 'utf8');
      expect(configProvider.get('db.host')).toBe('db-server');
      expect(configProvider.get('db.port')).toBe(5432);
    });

    it('should merge with existing config', async () => {
      configProvider.set('app.name', 'test-app');
      await configProvider.loadFile('config.json');
      
      expect(configProvider.get('app.name')).toBe('test-app');
      expect(configProvider.get('db.host')).toBe('db-server');
    });

    it('should throw an error when file reading fails', async () => {
      (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      
      await expect(configProvider.loadFile('nonexistent.json')).rejects.toThrow(/Failed to load configuration/);
    });
  });

  describe('loadEnvironment', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
      process.env = {
        APP_NAME: 'env-app',
        APP_VERSION: '2.0.0',
        DB_HOST: 'env-db-server',
        DB_PORT: '5432',
        NESTED_JSON_CONFIG: '{"key": "value"}'
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load config from environment variables', () => {
      configProvider.loadEnvironment();
      
      expect(configProvider.get('app.name')).toBe('env-app');
      expect(configProvider.get('app.version')).toBe('2.0.0');
      expect(configProvider.get('db.host')).toBe('env-db-server');
      expect(configProvider.get('db.port')).toBe(5432);
    });

    it('should parse JSON values from environment variables', () => {
      configProvider.loadEnvironment();
      
      expect(configProvider.get('nested.json.config')).toEqual({ key: 'value' });
    });

    it('should only load environment variables with specified prefix', () => {
      configProvider.loadEnvironment('APP');
      
      expect(configProvider.has('name')).toBe(true); // APP_NAME -> name
      expect(configProvider.has('version')).toBe(true); // APP_VERSION -> version
      expect(configProvider.has('db.host')).toBe(false); // DB_HOST not included
    });
  });

  describe('reset', () => {
    it('should clear all configuration values', () => {
      configProvider.set('app.name', 'test-app');
      configProvider.reset();
      
      expect(configProvider.getAll()).toEqual({});
    });

    it('should return the provider instance', () => {
      expect(configProvider.reset()).toBe(configProvider);
    });
  });

  describe('validate', () => {
    it('should return true when no schema is defined', () => {
      expect(configProvider.validate()).toBe(true);
    });

    it('should validate against schema and return true when valid', () => {
      const schema = {
        app: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            port: { type: 'number', minimum: 1000, maximum: 9999 }
          }
        }
      };

      configProvider = new DefaultConfigProvider({
        app: {
          name: 'test-app',
          port: 3000
        }
      }, schema);

      expect(configProvider.validate()).toBe(true);
    });

    it('should throw an error when validation fails for missing required property', () => {
      const schema = {
        app: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            port: { type: 'number' }
          }
        }
      };

      configProvider = new DefaultConfigProvider({
        app: {
          port: 3000
        }
      }, schema);

      expect(() => configProvider.validate()).toThrow(/Required property "app.name" is missing/);
    });

    it('should throw an error when validation fails for wrong type', () => {
      const schema = {
        app: {
          type: 'object',
          properties: {
            port: { type: 'number' }
          }
        }
      };

      configProvider = new DefaultConfigProvider({
        app: {
          port: '3000' // String instead of number
        }
      }, schema);

      expect(() => configProvider.validate()).toThrow(/should be of type "number"/);
    });
  });

  describe('saveToFile', () => {
    beforeEach(() => {
      configProvider = new DefaultConfigProvider({
        app: {
          name: 'test-app',
          port: 3000
        }
      });

      (path.extname as jest.Mock).mockReturnValue('.json');
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('should save config to a JSON file', async () => {
      await configProvider.saveToFile('config.json');
      
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        'config.json',
        JSON.stringify(configProvider.getAll(), null, 2),
        'utf8'
      );
    });

    it('should throw an error for unsupported file extension', async () => {
      (path.extname as jest.Mock).mockReturnValue('.txt');
      
      await expect(configProvider.saveToFile('config.txt')).rejects.toThrow(/Unsupported file extension/);
    });

    it('should throw an error when file writing fails', async () => {
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Cannot write file'));
      
      await expect(configProvider.saveToFile('config.json')).rejects.toThrow(/Failed to save configuration/);
    });
  });
}); 