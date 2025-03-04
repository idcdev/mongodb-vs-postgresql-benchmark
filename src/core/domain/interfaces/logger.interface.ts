/**
 * Logger Interface
 * 
 * This interface defines the contract for the logger service,
 * which is responsible for logging information during benchmark execution.
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /**
   * Timestamp of the log entry
   */
  timestamp: Date;
  
  /**
   * Log level
   */
  level: LogLevel;
  
  /**
   * Log message
   */
  message: string;
  
  /**
   * Optional context data
   */
  context?: Record<string, any>;
  
  /**
   * Optional error object
   */
  error?: Error;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  /**
   * Minimum log level to output
   */
  minLevel?: LogLevel;
  
  /**
   * Whether to include timestamps in log output
   */
  timestamps?: boolean;
  
  /**
   * Whether to include log level in output
   */
  showLevel?: boolean;
  
  /**
   * Output file path (if logging to file)
   */
  filePath?: string;
  
  /**
   * Whether to log to console
   */
  console?: boolean;
  
  /**
   * Whether to format logs as JSON
   */
  json?: boolean;
  
  /**
   * Custom formatter function
   */
  formatter?: (entry: LogEntry) => string;
}

/**
 * Core logger interface
 */
export interface Logger {
  /**
   * Log a debug message
   * 
   * @param message - The message to log
   * @param context - Optional context data
   */
  debug(message: string, context?: Record<string, any>): void;
  
  /**
   * Log an info message
   * 
   * @param message - The message to log
   * @param context - Optional context data
   */
  info(message: string, context?: Record<string, any>): void;
  
  /**
   * Log a warning message
   * 
   * @param message - The message to log
   * @param context - Optional context data
   */
  warn(message: string, context?: Record<string, any>): void;
  
  /**
   * Log an error message
   * 
   * @param message - The message to log
   * @param error - Optional error object
   * @param context - Optional context data
   */
  error(message: string, error?: Error, context?: Record<string, any>): void;
  
  /**
   * Log a fatal message
   * 
   * @param message - The message to log
   * @param error - Optional error object
   * @param context - Optional context data
   */
  fatal(message: string, error?: Error, context?: Record<string, any>): void;
  
  /**
   * Log a message with a specific level
   * 
   * @param level - The log level
   * @param message - The message to log
   * @param context - Optional context data
   * @param error - Optional error object
   */
  log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void;
  
  /**
   * Create a child logger with additional context
   * 
   * @param context - Context data to include in all logs from this child
   * @returns A new logger instance with the merged context
   */
  child(context: Record<string, any>): Logger;
  
  /**
   * Set the minimum log level
   * 
   * @param level - The minimum log level
   */
  setLevel(level: LogLevel): void;
  
  /**
   * Get the current minimum log level
   * 
   * @returns The current minimum log level
   */
  getLevel(): LogLevel;
} 