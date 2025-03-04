/**
 * MongoDB vs PostgreSQL Benchmark
 * 
 * This is the main entry point for the benchmark application.
 * It exports all components and provides the main API.
 */

// Export all core components
export * from './core';

// Re-export specific components for convenience
export { DatabaseType } from './core/domain/interfaces/database-adapter.interface';
export { DataSize } from './core/domain/model/benchmark-options';
export { BenchmarkService } from './core/domain/interfaces/benchmark-service.interface';
export { ReportFormat } from './core/domain/interfaces/report-service.interface'; 