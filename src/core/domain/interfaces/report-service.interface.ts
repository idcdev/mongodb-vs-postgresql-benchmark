/**
 * Report Service Interface
 * 
 * This interface defines the contract for the report service,
 * which is responsible for generating reports from benchmark results.
 */

import { BenchmarkResult } from '../model/benchmark-result';

/**
 * Report format options
 */
export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  HTML = 'html',
  MARKDOWN = 'markdown',
  TEXT = 'text'
}

/**
 * Report options
 */
export interface ReportOptions {
  /**
   * Format of the report
   */
  format: ReportFormat;
  
  /**
   * Output file path
   */
  outputPath?: string;
  
  /**
   * Include detailed metrics
   */
  detailed?: boolean;
  
  /**
   * Include charts (for HTML and Markdown formats)
   */
  includeCharts?: boolean;
  
  /**
   * Include comparison with previous results
   */
  includeComparison?: boolean;
  
  /**
   * Custom title for the report
   */
  title?: string;
  
  /**
   * Custom description for the report
   */
  description?: string;
}

/**
 * Core report service interface
 */
export interface ReportService {
  /**
   * Generate a report from a single benchmark result
   * 
   * @param result - The benchmark result
   * @param options - Report generation options
   * @returns A promise that resolves to the report content
   */
  generateReport(result: BenchmarkResult, options: ReportOptions): Promise<string>;
  
  /**
   * Generate a report from multiple benchmark results
   * 
   * @param results - The benchmark results
   * @param options - Report generation options
   * @returns A promise that resolves to the report content
   */
  generateComparisonReport(results: BenchmarkResult[], options: ReportOptions): Promise<string>;
  
  /**
   * Save a report to a file
   * 
   * @param content - The report content
   * @param filePath - The file path to save the report to
   * @returns A promise that resolves when the report is saved
   */
  saveReport(content: string, filePath: string): Promise<void>;
  
  /**
   * Get available report formats
   * 
   * @returns Array of available report formats
   */
  getAvailableFormats(): ReportFormat[];
  
  /**
   * Get default report options
   * 
   * @returns Default report options
   */
  getDefaultOptions(): ReportOptions;
} 