/**
 * Validation Service Interface
 * 
 * This interface defines the contract for the validation service,
 * which is responsible for validating data and configurations.
 */

/**
 * Validation error structure
 */
export interface ValidationError {
  /**
   * Path to the property with the error
   */
  path: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Error type/code
   */
  type?: string;
  
  /**
   * Value that caused the error
   */
  value?: any;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  valid: boolean;
  
  /**
   * Validation errors (if any)
   */
  errors: ValidationError[];
}

/**
 * Validation schema types
 */
export enum SchemaType {
  JSON_SCHEMA = 'json-schema',
  YUP = 'yup',
  ZOD = 'zod',
  JOI = 'joi',
  CUSTOM = 'custom'
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Whether to abort on first error
   */
  abortEarly?: boolean;
  
  /**
   * Whether to strip unknown properties
   */
  stripUnknown?: boolean;
  
  /**
   * Whether to allow unknown properties
   */
  allowUnknown?: boolean;
  
  /**
   * Context data for validation
   */
  context?: Record<string, any>;
}

/**
 * Core validation service interface
 */
export interface ValidationService {
  /**
   * Validate data against a schema
   * 
   * @param data - The data to validate
   * @param schema - The schema to validate against
   * @param options - Validation options
   * @returns Validation result
   */
  validate(data: any, schema: any, options?: ValidationOptions): ValidationResult;
  
  /**
   * Register a schema for later use
   * 
   * @param name - Name of the schema
   * @param schema - The schema to register
   * @param type - Type of the schema
   * @returns The validation service instance
   */
  registerSchema(name: string, schema: any, type?: SchemaType): ValidationService;
  
  /**
   * Validate data against a registered schema
   * 
   * @param data - The data to validate
   * @param schemaName - Name of the registered schema
   * @param options - Validation options
   * @returns Validation result
   */
  validateWithRegisteredSchema(
    data: any,
    schemaName: string,
    options?: ValidationOptions
  ): ValidationResult;
  
  /**
   * Check if a schema is registered
   * 
   * @param name - Name of the schema
   * @returns Whether the schema is registered
   */
  hasSchema(name: string): boolean;
  
  /**
   * Get a registered schema
   * 
   * @param name - Name of the schema
   * @returns The registered schema or null if not found
   */
  getSchema(name: string): any | null;
  
  /**
   * Remove a registered schema
   * 
   * @param name - Name of the schema to remove
   * @returns Whether the schema was removed
   */
  removeSchema(name: string): boolean;
  
  /**
   * Format validation errors
   * 
   * @param errors - Validation errors
   * @returns Formatted error messages
   */
  formatErrors(errors: ValidationError[]): string[];
  
  /**
   * Get the default validation options
   * 
   * @returns Default validation options
   */
  getDefaultOptions(): ValidationOptions;
} 