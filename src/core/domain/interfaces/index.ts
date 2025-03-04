/**
 * Domain Interfaces Barrel File
 * 
 * This file exports all domain interfaces to simplify imports.
 */

// Database interfaces
export * from './database-adapter.interface';

// Benchmark interfaces
export * from './benchmark.interface';
export * from './benchmark-service.interface';

// Configuration interfaces
export * from './config-provider.interface';

// Event interfaces
export * from './event-emitter.interface';

// Logging interfaces
export * from './logger.interface';

// Data interfaces
export * from './data-service.interface';

// Metrics interfaces
export * from './metrics-service.interface';

// Validation interfaces
export * from './validation-service.interface';

// Storage interfaces
export * from './storage-service.interface';

// Report interfaces
export * from './report-service.interface';

// CLI interfaces
export * from './cli-handler.interface'; 