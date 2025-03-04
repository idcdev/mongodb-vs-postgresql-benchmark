/**
 * DefaultReportService Tests
 * 
 * These tests verify the functionality of the DefaultReportService implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { DefaultReportService } from './default-report-service';
import { ReportFormat, ReportOptions } from '../../domain/interfaces/report-service.interface';
import { BenchmarkResult, DatabaseBenchmarkResult } from '../../domain/model/benchmark-result';
import { DatabaseType } from '../../domain/interfaces/database-adapter.interface';

// Mock filesystem functions
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Setup mock data
const mockEnvironment = {
  os: {
    type: 'Test OS',
    platform: 'test',
    release: '1.0',
    architecture: 'x64'
  },
  nodejs: {
    version: '16.0.0',
    memoryUsage: {
      heapTotal: 100000,
      heapUsed: 50000,
      external: 10000,
      rss: 200000
    }
  },
  database: {
    type: 'Test DB',
    version: '1.0.0'
  },
  hardware: {
    cpu: 'Test CPU',
    cores: 8,
    memory: 16000000000
  }
};

const mockDatabaseResult: DatabaseBenchmarkResult = {
  databaseType: DatabaseType.MONGODB,
  durations: [100, 110, 90, 95, 105],
  iterations: [
    { durationMs: 100 },
    { durationMs: 110 },
    { durationMs: 90 },
    { durationMs: 95 },
    { durationMs: 105 }
  ],
  statistics: {
    minDurationMs: 90,
    maxDurationMs: 110,
    meanDurationMs: 100,
    medianDurationMs: 100,
    stdDevDurationMs: 7.07,
    p95DurationMs: 110,
    p99DurationMs: 110,
    coefficientOfVariation: 0.0707
  },
  operation: {
    type: 'insert',
    count: 1000
  }
};

const createMockBenchmarkResult = (name: string): BenchmarkResult => ({
  name,
  description: `Test benchmark for ${name}`,
  timestamp: new Date().toISOString(),
  environment: mockEnvironment,
  mongodb: { ...mockDatabaseResult, databaseType: DatabaseType.MONGODB },
  postgresql: { ...mockDatabaseResult, databaseType: DatabaseType.POSTGRESQL },
  comparison: {
    meanDiffMs: 10,
    medianDiffMs: 5,
    medianRatio: 1.05,
    percentageDiff: 5,
    winner: DatabaseType.MONGODB
  }
});

describe('DefaultReportService', () => {
  let reportService: DefaultReportService;
  let mockResult: BenchmarkResult;
  let mockResults: BenchmarkResult[];
  
  beforeEach(() => {
    jest.clearAllMocks();
    reportService = new DefaultReportService();
    mockResult = createMockBenchmarkResult('Test Benchmark');
    mockResults = [
      createMockBenchmarkResult('Benchmark 1'),
      createMockBenchmarkResult('Benchmark 2')
    ];
    
    // Reset mock behaviors
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });
  
  describe('constructor', () => {
    test('should create an instance', () => {
      expect(reportService).toBeInstanceOf(DefaultReportService);
    });
  });
  
  describe('getAvailableFormats', () => {
    test('should return all supported formats', () => {
      const formats = reportService.getAvailableFormats();
      expect(formats).toContain(ReportFormat.JSON);
      expect(formats).toContain(ReportFormat.CSV);
      expect(formats).toContain(ReportFormat.HTML);
      expect(formats).toContain(ReportFormat.MARKDOWN);
      expect(formats).toContain(ReportFormat.TEXT);
      expect(formats.length).toBe(5);
    });
  });
  
  describe('getDefaultOptions', () => {
    test('should return default options with JSON format', () => {
      const options = reportService.getDefaultOptions();
      expect(options.format).toBe(ReportFormat.JSON);
      expect(options.detailed).toBe(true);
      expect(options.includeComparison).toBe(true);
    });
  });
  
  describe('generateReport', () => {
    test('should throw error for null result', async () => {
      await expect(reportService.generateReport(null as any, { format: ReportFormat.JSON }))
        .rejects.toThrow('Benchmark result cannot be null or undefined');
    });
    
    test('should throw error for invalid result', async () => {
      const invalidResult = { ...mockResult, name: '' };
      await expect(reportService.generateReport(invalidResult as any, { format: ReportFormat.JSON }))
        .rejects.toThrow('Benchmark result must have a name');
    });
    
    test('should throw error for unsupported format', async () => {
      await expect(reportService.generateReport(mockResult, { format: 'invalid' as any }))
        .rejects.toThrow('Unsupported report format: invalid');
    });
    
    test('should generate JSON report', async () => {
      const report = await reportService.generateReport(mockResult, { format: ReportFormat.JSON });
      expect(report).toContain(mockResult.name);
      expect(report).toContain(mockResult.description);
      expect(JSON.parse(report)).toHaveProperty('mongodb');
      expect(JSON.parse(report)).toHaveProperty('postgresql');
    });
    
    test('should generate CSV report', async () => {
      const report = await reportService.generateReport(mockResult, { format: ReportFormat.CSV });
      expect(report).toContain('Benchmark Name');
      expect(report).toContain('Test Benchmark');
      expect(report).toContain('MongoDB');
      expect(report).toContain('PostgreSQL');
    });
    
    test('should generate HTML report', async () => {
      const report = await reportService.generateReport(mockResult, { format: ReportFormat.HTML });
      expect(report).toContain('<html>');
      expect(report).toContain(mockResult.name);
      expect(report).toContain('<table>');
    });
    
    test('should generate Markdown report', async () => {
      const report = await reportService.generateReport(mockResult, { format: ReportFormat.MARKDOWN });
      expect(report).toContain('# Benchmark Report');
      expect(report).toContain(`## Benchmark: ${mockResult.name}`);
      expect(report).toContain('| Metric | Value |');
    });
    
    test('should generate Text report', async () => {
      const report = await reportService.generateReport(mockResult, { format: ReportFormat.TEXT });
      expect(report).toContain('Benchmark Report');
      expect(report).toContain(`Benchmark: ${mockResult.name}`);
      expect(report).toContain('Results:');
    });
    
    test('should use default format if not specified', async () => {
      const defaultOptions = reportService.getDefaultOptions();
      const report = await reportService.generateReport(mockResult, { format: defaultOptions.format });
      expect(JSON.parse(report)).toHaveProperty('name', mockResult.name);
    });
    
    test('should respect detailed option for JSON format', async () => {
      const report = await reportService.generateReport(mockResult, { 
        format: ReportFormat.JSON, 
        detailed: false 
      });
      
      const parsed = JSON.parse(report);
      expect(parsed.mongodb).not.toHaveProperty('durations');
      expect(parsed.mongodb).not.toHaveProperty('iterations');
      expect(parsed.mongodb).toHaveProperty('statistics');
    });
    
    test('should respect includeComparison option', async () => {
      const reportWithComparison = await reportService.generateReport(mockResult, {
        format: ReportFormat.JSON,
        includeComparison: true
      });
      
      const reportWithoutComparison = await reportService.generateReport(mockResult, {
        format: ReportFormat.JSON,
        includeComparison: false
      });
      
      expect(JSON.parse(reportWithComparison)).toHaveProperty('comparison');
      expect(JSON.parse(reportWithoutComparison)).not.toHaveProperty('comparison');
    });
  });
  
  describe('generateComparisonReport', () => {
    test('should throw error for empty results', async () => {
      await expect(reportService.generateComparisonReport([], { format: ReportFormat.JSON }))
        .rejects.toThrow('No benchmark results provided');
    });
    
    test('should call generateReport for single result', async () => {
      const spy = jest.spyOn(reportService, 'generateReport');
      await reportService.generateComparisonReport([mockResult], { format: ReportFormat.JSON });
      expect(spy).toHaveBeenCalledWith(mockResult, { format: ReportFormat.JSON });
    });
    
    test('should generate JSON comparison report', async () => {
      const report = await reportService.generateComparisonReport(mockResults, { format: ReportFormat.JSON });
      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('results');
      expect(parsed.results).toHaveLength(2);
      expect(parsed).toHaveProperty('comparison');
    });
    
    test('should generate CSV comparison report', async () => {
      const report = await reportService.generateComparisonReport(mockResults, { format: ReportFormat.CSV });
      expect(report).toContain('Benchmark Name');
      expect(report).toContain('Benchmark 1');
      expect(report).toContain('Benchmark 2');
    });
    
    test('should generate HTML comparison report', async () => {
      const report = await reportService.generateComparisonReport(mockResults, { format: ReportFormat.HTML });
      expect(report).toContain('<html>');
      expect(report).toContain('Benchmark 1');
      expect(report).toContain('Benchmark 2');
    });
    
    test('should generate Markdown comparison report', async () => {
      const report = await reportService.generateComparisonReport(mockResults, { format: ReportFormat.MARKDOWN });
      expect(report).toContain('# Benchmark Comparison Report');
      expect(report).toContain('## Benchmark 1: Benchmark 1');
      expect(report).toContain('## Benchmark 2: Benchmark 2');
    });
    
    test('should generate Text comparison report', async () => {
      const report = await reportService.generateComparisonReport(mockResults, { format: ReportFormat.TEXT });
      expect(report).toContain('Benchmark Comparison Report');
      expect(report).toContain('Benchmark 1: Benchmark 1');
      expect(report).toContain('Benchmark 2: Benchmark 2');
    });
  });
  
  describe('saveReport', () => {
    test('should create directory if it does not exist', async () => {
      const filePath = '/test/dir/report.json';
      const content = 'test content';
      
      await reportService.saveReport(content, filePath);
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, content, 'utf8');
    });
    
    test('should not create directory if it exists', async () => {
      const filePath = '/test/dir/report.json';
      const content = 'test content';
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      
      await reportService.saveReport(content, filePath);
      
      expect(fs.existsSync).toHaveBeenCalledWith('/test/dir');
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalledWith(filePath, content, 'utf8');
    });
    
    test('should throw error if writing fails', async () => {
      const filePath = '/test/dir/report.json';
      const content = 'test content';
      const error = new Error('Write error');
      
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(error);
      
      await expect(reportService.saveReport(content, filePath))
        .rejects.toThrow('Failed to save report: Write error');
    });
  });
}); 