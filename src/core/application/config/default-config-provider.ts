/**
 * Default Configuration Provider
 * 
 * This class implements the ConfigProvider interface and provides a default
 * implementation for managing configuration values.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigProvider, ConfigValue } from '../../domain/interfaces';
import { set, get, has } from 'lodash';

/**
 * Schema property type for configuration validation
 */
interface SchemaProperty {
  type?: string;
  required?: boolean;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

/**
 * Default implementation of the ConfigProvider interface
 */
export class DefaultConfigProvider implements ConfigProvider {
  private configValues: Record<string, ConfigValue> = {};
  private schema?: Record<string, SchemaProperty>;

  /**
   * Create a new configuration provider
   * 
   * @param initialValues - Optional initial configuration values
   * @param schema - Optional schema for validation
   */
  constructor(
    initialValues?: Record<string, ConfigValue>,
    schema?: Record<string, SchemaProperty>
  ) {
    if (initialValues) {
      this.configValues = { ...initialValues };
    }
    if (schema) {
      this.schema = schema;
    }
  }

  /**
   * Get a configuration value
   * 
   * @param key - The configuration key (dot notation supported)
   * @param defaultValue - The default value if the key is not found
   * @returns The configuration value or default value
   */
  public get<T extends ConfigValue>(key: string, defaultValue?: T): T {
    if (!has(this.configValues, key)) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Configuration key "${key}" not found and no default value provided`);
    }
    return get(this.configValues, key) as T;
  }

  /**
   * Check if a configuration key exists
   * 
   * @param key - The configuration key (dot notation supported)
   * @returns true if the key exists, false otherwise
   */
  public has(key: string): boolean {
    return has(this.configValues, key);
  }

  /**
   * Set a configuration value
   * 
   * @param key - The configuration key (dot notation supported)
   * @param value - The value to set
   * @returns The configuration provider instance
   */
  public set<T extends ConfigValue>(key: string, value: T): ConfigProvider {
    set(this.configValues, key, value);
    return this;
  }

  /**
   * Get all configuration values
   * 
   * @returns All configuration values as an object
   */
  public getAll(): Record<string, ConfigValue> {
    return { ...this.configValues };
  }

  /**
   * Load configuration from a file
   * 
   * @param filePath - The path to the configuration file
   * @returns A promise that resolves when the file is loaded
   */
  public async loadFile(filePath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(filePath);
      const fileContent = await fs.promises.readFile(resolvedPath, 'utf8');
      const fileExtension = path.extname(filePath).toLowerCase();
      
      let parsedConfig: Record<string, ConfigValue>;

      // Parse file based on extension
      if (fileExtension === '.json') {
        parsedConfig = JSON.parse(fileContent);
      } else if (fileExtension === '.js') {
        // For JS files, require them directly (this won't work with TypeScript directly, 
        // but will work with compiled JS files)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        parsedConfig = require(resolvedPath);
      } else {
        throw new Error(`Unsupported file extension: ${fileExtension}`);
      }

      // Merge with existing configuration
      this.configValues = {
        ...this.configValues,
        ...parsedConfig
      };
    } catch (error) {
      throw new Error(`Failed to load configuration from file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from environment variables
   * 
   * @param prefix - Optional prefix for environment variables
   * @returns The configuration provider instance
   */
  public loadEnvironment(prefix?: string): ConfigProvider {
    const envVars = process.env;
    const prefixStr = prefix ? `${prefix}_` : '';
    const prefixLength = prefixStr.length;

    for (const [key, value] of Object.entries(envVars)) {
      if (prefix && !key.startsWith(prefixStr)) {
        continue;
      }

      // Transform environment variable to config key
      const configKey = prefix 
        ? key.substring(prefixLength).toLowerCase().replace(/_/g, '.') 
        : key.toLowerCase().replace(/_/g, '.');

      // Try to parse the value as JSON first, if it fails use the raw string
      try {
        const parsedValue = JSON.parse(value || '');
        this.set(configKey, parsedValue);
      } catch (e) {
        this.set(configKey, value);
      }
    }

    return this;
  }

  /**
   * Reset configuration to default values
   * 
   * @returns The configuration provider instance
   */
  public reset(): ConfigProvider {
    this.configValues = {};
    return this;
  }

  /**
   * Validate configuration against a schema
   * 
   * @returns true if valid, throws an error otherwise
   */
  public validate(): boolean {
    if (!this.schema) {
      // No schema defined, consider valid
      return true;
    }

    // Basic validation - could be replaced with a more robust validation library
    try {
      this.validateObject(this.configValues, this.schema);
      return true;
    } catch (error) {
      throw new Error(`Configuration validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Set the validation schema
   * 
   * @param schema - The schema to use for validation
   * @returns The configuration provider instance
   */
  public setSchema(schema: Record<string, SchemaProperty>): ConfigProvider {
    this.schema = schema;
    return this;
  }

  /**
   * Save configuration to a file
   * 
   * @param filePath - The path to save the configuration to
   * @returns A promise that resolves when the file is saved
   */
  public async saveToFile(filePath: string): Promise<void> {
    try {
      const fileExtension = path.extname(filePath).toLowerCase();
      
      if (fileExtension === '.json') {
        const jsonContent = JSON.stringify(this.configValues, null, 2);
        await fs.promises.writeFile(filePath, jsonContent, 'utf8');
      } else {
        throw new Error(`Unsupported file extension for saving: ${fileExtension}`);
      }
    } catch (error) {
      throw new Error(`Failed to save configuration to file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Basic object validation against a schema
   * 
   * @param obj - The object to validate
   * @param schema - The schema to validate against
   * @param prefix - Current path for error messages
   */
  private validateObject(obj: any, schema: Record<string, SchemaProperty>, prefix = ''): void {
    // Check if the object has all required properties
    for (const [key, schemaValue] of Object.entries(schema)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      
      // Check if property is required
      const isRequired = schemaValue.required === true;
      
      if (isRequired && !(key in obj)) {
        throw new Error(`Required property "${fullPath}" is missing`);
      }

      if (key in obj) {
        const value = obj[key];
        
        // Check type
        if (schemaValue.type && typeof value !== schemaValue.type) {
          throw new Error(`Property "${fullPath}" should be of type "${schemaValue.type}", got "${typeof value}"`);
        }

        // Validate nested objects
        if (schemaValue.properties && typeof value === 'object' && value !== null) {
          this.validateObject(value, schemaValue.properties, fullPath);
        }

        // Validate arrays
        if (schemaValue.items && Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            this.validateValue(value[i], schemaValue.items, `${fullPath}[${i}]`);
          }
        }

        // Validate enum values
        if (schemaValue.enum && !schemaValue.enum.includes(value)) {
          throw new Error(`Property "${fullPath}" should be one of [${schemaValue.enum.join(', ')}], got "${value}"`);
        }

        // Validate min/max for numbers
        if (typeof value === 'number') {
          if (schemaValue.minimum !== undefined && value < schemaValue.minimum) {
            throw new Error(`Property "${fullPath}" should be greater than or equal to ${schemaValue.minimum}`);
          }
          if (schemaValue.maximum !== undefined && value > schemaValue.maximum) {
            throw new Error(`Property "${fullPath}" should be less than or equal to ${schemaValue.maximum}`);
          }
        }

        // Validate minLength/maxLength for strings
        if (typeof value === 'string') {
          if (schemaValue.minLength !== undefined && value.length < schemaValue.minLength) {
            throw new Error(`Property "${fullPath}" should have a minimum length of ${schemaValue.minLength}`);
          }
          if (schemaValue.maxLength !== undefined && value.length > schemaValue.maxLength) {
            throw new Error(`Property "${fullPath}" should have a maximum length of ${schemaValue.maxLength}`);
          }
        }
      }
    }
  }

  /**
   * Validate a single value against a schema
   * 
   * @param value - The value to validate
   * @param schema - The schema to validate against
   * @param path - Current path for error messages
   */
  private validateValue(value: any, schema: SchemaProperty, path: string): void {
    // Check type
    if (schema.type && typeof value !== schema.type) {
      throw new Error(`Value at "${path}" should be of type "${schema.type}", got "${typeof value}"`);
    }

    // Nested objects
    if (schema.properties && typeof value === 'object' && value !== null) {
      this.validateObject(value, schema.properties, path);
    }

    // Validate enum values
    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`Value at "${path}" should be one of [${schema.enum.join(', ')}], got "${value}"`);
    }

    // Validate min/max for numbers
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new Error(`Value at "${path}" should be greater than or equal to ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new Error(`Value at "${path}" should be less than or equal to ${schema.maximum}`);
      }
    }

    // Validate minLength/maxLength for strings
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        throw new Error(`Value at "${path}" should have a minimum length of ${schema.minLength}`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        throw new Error(`Value at "${path}" should have a maximum length of ${schema.maxLength}`);
      }
    }
  }
} 