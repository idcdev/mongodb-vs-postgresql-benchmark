/**
 * Configuration Provider Interface
 * 
 * This interface defines the contract for configuration providers in the application.
 * It enables centralized access to configuration values from multiple sources.
 */

/**
 * Configuration value type (for type-safe access)
 */
export type ConfigValue = string | number | boolean | object | null | undefined;

/**
 * Core configuration provider interface
 */
export interface ConfigProvider {
  /**
   * Get a configuration value
   * 
   * @param key - The configuration key (dot notation supported)
   * @param defaultValue - The default value if the key is not found
   * @returns The configuration value or default value
   */
  get<T extends ConfigValue>(key: string, defaultValue?: T): T;
  
  /**
   * Check if a configuration key exists
   * 
   * @param key - The configuration key (dot notation supported)
   * @returns true if the key exists, false otherwise
   */
  has(key: string): boolean;
  
  /**
   * Set a configuration value
   * 
   * @param key - The configuration key (dot notation supported)
   * @param value - The value to set
   * @returns The configuration provider instance
   */
  set<T extends ConfigValue>(key: string, value: T): ConfigProvider;
  
  /**
   * Get all configuration values
   * 
   * @returns All configuration values as an object
   */
  getAll(): Record<string, ConfigValue>;
  
  /**
   * Load configuration from a file
   * 
   * @param filePath - The path to the configuration file
   * @returns A promise that resolves when the file is loaded
   */
  loadFile(filePath: string): Promise<void>;
  
  /**
   * Load configuration from environment variables
   * 
   * @param prefix - Optional prefix for environment variables
   * @returns The configuration provider instance
   */
  loadEnvironment(prefix?: string): ConfigProvider;
  
  /**
   * Reset configuration to default values
   * 
   * @returns The configuration provider instance
   */
  reset(): ConfigProvider;
  
  /**
   * Validate configuration against a schema
   * 
   * @returns true if valid, throws an error otherwise
   */
  validate(): boolean;
} 