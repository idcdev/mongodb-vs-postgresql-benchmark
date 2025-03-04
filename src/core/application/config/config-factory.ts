/**
 * Configuration Factory
 * 
 * Factory for creating and managing configuration providers.
 */

import * as path from 'path';
import { ConfigProvider } from '../../domain/interfaces';
import { DefaultConfigProvider } from './default-config-provider';

/**
 * Configuration Factory class
 */
export class ConfigFactory {
  private static instance: ConfigProvider;
  private static readonly CONFIG_ENV_PREFIX = 'MONGO_X_PG';
  private static readonly DEFAULT_CONFIG_PATHS = [
    path.join(process.cwd(), 'config', 'default.config.json'),
    path.join(process.cwd(), 'config', `${process.env.NODE_ENV || 'development'}.config.json`),
    path.join(process.cwd(), 'config', 'local.config.json')
  ];

  /**
   * Get the singleton configuration provider instance
   * 
   * @returns The configuration provider instance
   */
  public static getInstance(): ConfigProvider {
    if (!ConfigFactory.instance) {
      ConfigFactory.instance = ConfigFactory.createConfigProvider();
    }
    return ConfigFactory.instance;
  }

  /**
   * Reset the singleton instance
   * 
   * @returns The config factory
   */
  public static reset(): typeof ConfigFactory {
    ConfigFactory.instance = undefined as any;
    return ConfigFactory;
  }

  /**
   * Create a new configuration provider with default settings
   * 
   * @returns A new configuration provider
   */
  public static createConfigProvider(): ConfigProvider {
    const provider = new DefaultConfigProvider();
    
    // Load configs in order of priority (lower to higher)
    ConfigFactory.loadConfigFiles(provider)
      .then(() => {
        // Load environment variables last (highest priority)
        provider.loadEnvironment(ConfigFactory.CONFIG_ENV_PREFIX);
      })
      .catch(err => {
        console.error('Error loading configuration files:', err);
      });

    return provider;
  }

  /**
   * Load configuration files
   * 
   * @param provider - The configuration provider
   * @returns A promise that resolves when all files are loaded
   */
  private static async loadConfigFiles(provider: ConfigProvider): Promise<void> {
    for (const configPath of ConfigFactory.DEFAULT_CONFIG_PATHS) {
      try {
        await provider.loadFile(configPath);
      } catch (err) {
        // Ignore file not found errors, but log other errors
        if (!(err as Error).message.includes('ENOENT')) {
          console.warn(`Error loading config from ${configPath}:`, err);
        }
      }
    }
  }

  /**
   * Private constructor to prevent instantiation
   */
  private constructor() {
    // This class cannot be instantiated
  }
} 