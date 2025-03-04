/**
 * Default Report Service Implementation
 * 
 * This class implements the ReportService interface and provides
 * functionality to generate reports in various formats from benchmark results.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { 
  ReportService, 
  ReportOptions, 
  ReportFormat 
} from '../../domain/interfaces/report-service.interface';
import { BenchmarkResult } from '../../domain/model/benchmark-result';

// Promisify fs methods
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Default implementation of the Report Service
 */
export class DefaultReportService implements ReportService {
  /**
   * Generate a report from a single benchmark result
   * 
   * @param result - The benchmark result
   * @param options - Report generation options
   * @returns A promise that resolves to the report content
   */
  public async generateReport(result: BenchmarkResult, options: ReportOptions): Promise<string> {
    this.validateResult(result);
    const format = options.format || this.getDefaultOptions().format;
    
    switch (format) {
      case ReportFormat.JSON:
        return this.generateJsonReport(result, options);
      case ReportFormat.CSV:
        return this.generateCsvReport(result, options);
      case ReportFormat.HTML:
        return this.generateHtmlReport(result, options);
      case ReportFormat.MARKDOWN:
        return this.generateMarkdownReport(result, options);
      case ReportFormat.TEXT:
        return this.generateTextReport(result, options);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Generate a report from multiple benchmark results
   * 
   * @param results - The benchmark results
   * @param options - Report generation options
   * @returns A promise that resolves to the report content
   */
  public async generateComparisonReport(results: BenchmarkResult[], options: ReportOptions): Promise<string> {
    if (!results || results.length === 0) {
      throw new Error('No benchmark results provided');
    }
    
    if (results.length === 1) {
      return this.generateReport(results[0], options);
    }
    
    const format = options.format || this.getDefaultOptions().format;
    
    switch (format) {
      case ReportFormat.JSON:
        return this.generateJsonComparisonReport(results, options);
      case ReportFormat.CSV:
        return this.generateCsvComparisonReport(results, options);
      case ReportFormat.HTML:
        return this.generateHtmlComparisonReport(results, options);
      case ReportFormat.MARKDOWN:
        return this.generateMarkdownComparisonReport(results, options);
      case ReportFormat.TEXT:
        return this.generateTextComparisonReport(results, options);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Save a report to a file
   * 
   * @param content - The report content
   * @param filePath - The file path to save the report to
   * @returns A promise that resolves when the report is saved
   */
  public async saveReport(content: string, filePath: string): Promise<void> {
    const directory = path.dirname(filePath);
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(directory)) {
        await mkdir(directory, { recursive: true });
      }
      
      // Write the report to the file
      await writeFile(filePath, content, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to save report: ${error.message}`);
    }
  }

  /**
   * Get available report formats
   * 
   * @returns Array of available report formats
   */
  public getAvailableFormats(): ReportFormat[] {
    return [
      ReportFormat.JSON,
      ReportFormat.CSV,
      ReportFormat.HTML,
      ReportFormat.MARKDOWN,
      ReportFormat.TEXT
    ];
  }

  /**
   * Get default report options
   * 
   * @returns Default report options
   */
  public getDefaultOptions(): ReportOptions {
    return {
      format: ReportFormat.JSON,
      detailed: true,
      includeCharts: false,
      includeComparison: true,
      title: 'Benchmark Report',
      description: 'Generated benchmark report'
    };
  }

  /**
   * Validate a benchmark result
   * 
   * @param result - The benchmark result to validate
   * @throws Error if the result is invalid
   */
  private validateResult(result: BenchmarkResult): void {
    if (!result) {
      throw new Error('Benchmark result cannot be null or undefined');
    }
    
    if (!result.name) {
      throw new Error('Benchmark result must have a name');
    }
    
    if (!result.timestamp) {
      throw new Error('Benchmark result must have a timestamp');
    }
    
    if (!result.environment) {
      throw new Error('Benchmark result must have environment information');
    }
  }

  /**
   * Generate a JSON report
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns JSON formatted report
   */
  private generateJsonReport(result: BenchmarkResult, options: ReportOptions): string {
    const reportData = this.prepareReportData(result, options);
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate a JSON comparison report
   * 
   * @param results - The benchmark results
   * @param options - Report options
   * @returns JSON formatted comparison report
   */
  private generateJsonComparisonReport(results: BenchmarkResult[], options: ReportOptions): string {
    const comparisonData = {
      title: options.title || 'Benchmark Comparison Report',
      description: options.description || 'Comparison of multiple benchmark results',
      timestamp: new Date().toISOString(),
      results: results.map(result => this.prepareReportData(result, options)),
      comparison: this.generateComparisonData(results)
    };
    
    return JSON.stringify(comparisonData, null, 2);
  }

  /**
   * Generate a CSV report
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns CSV formatted report
   */
  private generateCsvReport(result: BenchmarkResult, options: ReportOptions): string {
    const lines: string[] = [];
    
    // Add header
    lines.push(`"Benchmark Name","Database Type","Operation Type","Min (ms)","Max (ms)","Mean (ms)","Median (ms)","StdDev (ms)","P95 (ms)","P99 (ms)"`);
    
    // Add MongoDB data if available
    if (result.mongodb) {
      lines.push(this.databaseResultToCsvLine(result.name, 'MongoDB', result.mongodb));
    }
    
    // Add PostgreSQL data if available
    if (result.postgresql) {
      lines.push(this.databaseResultToCsvLine(result.name, 'PostgreSQL', result.postgresql));
    }
    
    // Add comparison if available and requested
    if (result.comparison && options.includeComparison) {
      lines.push('');
      lines.push('"Comparison"');
      lines.push(`"Difference (Mean)","${result.comparison.meanDiffMs} ms"`);
      lines.push(`"Difference (Median)","${result.comparison.medianDiffMs} ms"`);
      lines.push(`"Ratio (Median)","${result.comparison.medianRatio}"`);
      lines.push(`"Difference (%)","${result.comparison.percentageDiff}%"`);
      lines.push(`"Winner","${result.comparison.winner}"`);
    }
    
    return lines.join('\n');
  }

  /**
   * Generate a CSV comparison report
   * 
   * @param results - The benchmark results
   * @param options - Report options
   * @returns CSV formatted comparison report
   */
  private generateCsvComparisonReport(results: BenchmarkResult[], options: ReportOptions): string {
    const lines: string[] = [];
    
    // Add header
    lines.push(`"Benchmark Name","Database Type","Operation Type","Min (ms)","Max (ms)","Mean (ms)","Median (ms)","StdDev (ms)","P95 (ms)","P99 (ms)"`);
    
    // Add data for each benchmark result
    results.forEach(result => {
      if (result.mongodb) {
        lines.push(this.databaseResultToCsvLine(result.name, 'MongoDB', result.mongodb));
      }
      
      if (result.postgresql) {
        lines.push(this.databaseResultToCsvLine(result.name, 'PostgreSQL', result.postgresql));
      }
    });
    
    return lines.join('\n');
  }

  /**
   * Generate an HTML report
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns HTML formatted report
   */
  private generateHtmlReport(result: BenchmarkResult, options: ReportOptions): string {
    const title = options.title || 'Benchmark Report';
    const description = options.description || '';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          tr:hover { background-color: #f5f5f5; }
          .comparison { margin-top: 30px; padding: 10px; background-color: #f8f8f8; border-radius: 4px; }
          .winner { font-weight: bold; color: green; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <h2>Benchmark: ${result.name}</h2>
        <p>${result.description || ''}</p>
        <p><strong>Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
        
        <h3>Environment</h3>
        <table>
          <tr><th>OS</th><td>${result.environment.os.type} ${result.environment.os.platform} ${result.environment.os.release} (${result.environment.os.architecture})</td></tr>
          <tr><th>Node.js</th><td>${result.environment.nodejs.version}</td></tr>
          <tr><th>Database</th><td>${result.environment.database.type} ${result.environment.database.version}</td></tr>
        </table>
        
        <h3>Results</h3>
    `;
    
    if (result.mongodb) {
      html += this.databaseResultToHtmlTable('MongoDB', result.mongodb);
    }
    
    if (result.postgresql) {
      html += this.databaseResultToHtmlTable('PostgreSQL', result.postgresql);
    }
    
    if (result.comparison && options.includeComparison) {
      html += `
        <div class="comparison">
          <h3>Comparison</h3>
          <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Mean Difference</td><td>${result.comparison.meanDiffMs} ms</td></tr>
            <tr><td>Median Difference</td><td>${result.comparison.medianDiffMs} ms</td></tr>
            <tr><td>Median Ratio</td><td>${result.comparison.medianRatio}</td></tr>
            <tr><td>Percentage Difference</td><td>${result.comparison.percentageDiff}%</td></tr>
            <tr><td>Winner</td><td class="winner">${result.comparison.winner}</td></tr>
          </table>
        </div>
      `;
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  }

  /**
   * Generate an HTML comparison report
   * 
   * @param results - The benchmark results
   * @param options - Report options
   * @returns HTML formatted comparison report
   */
  private generateHtmlComparisonReport(results: BenchmarkResult[], options: ReportOptions): string {
    const title = options.title || 'Benchmark Comparison Report';
    const description = options.description || 'Comparison of multiple benchmark results';
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          tr:hover { background-color: #f5f5f5; }
          .benchmark { margin-top: 30px; padding: 10px; background-color: #f8f8f8; border-radius: 4px; }
          .winner { font-weight: bold; color: green; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${description}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    `;
    
    results.forEach((result, index) => {
      html += `
        <div class="benchmark">
          <h2>Benchmark ${index + 1}: ${result.name}</h2>
          <p>${result.description || ''}</p>
          <p><strong>Date:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
          
          <h3>Results</h3>
      `;
      
      if (result.mongodb) {
        html += this.databaseResultToHtmlTable('MongoDB', result.mongodb);
      }
      
      if (result.postgresql) {
        html += this.databaseResultToHtmlTable('PostgreSQL', result.postgresql);
      }
      
      html += '</div>';
    });
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  }

  /**
   * Generate a Markdown report
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns Markdown formatted report
   */
  private generateMarkdownReport(result: BenchmarkResult, options: ReportOptions): string {
    const title = options.title || 'Benchmark Report';
    const description = options.description || '';
    
    let markdown = `# ${title}\n\n`;
    markdown += `${description}\n\n`;
    markdown += `## Benchmark: ${result.name}\n\n`;
    markdown += `${result.description || ''}\n\n`;
    markdown += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
    
    markdown += `### Environment\n\n`;
    markdown += `- **OS:** ${result.environment.os.type} ${result.environment.os.platform} ${result.environment.os.release} (${result.environment.os.architecture})\n`;
    markdown += `- **Node.js:** ${result.environment.nodejs.version}\n`;
    markdown += `- **Database:** ${result.environment.database.type} ${result.environment.database.version}\n\n`;
    
    markdown += `### Results\n\n`;
    
    if (result.mongodb) {
      markdown += this.databaseResultToMarkdownTable('MongoDB', result.mongodb);
    }
    
    if (result.postgresql) {
      markdown += this.databaseResultToMarkdownTable('PostgreSQL', result.postgresql);
    }
    
    if (result.comparison && options.includeComparison) {
      markdown += `### Comparison\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `| ------ | ----- |\n`;
      markdown += `| Mean Difference | ${result.comparison.meanDiffMs} ms |\n`;
      markdown += `| Median Difference | ${result.comparison.medianDiffMs} ms |\n`;
      markdown += `| Median Ratio | ${result.comparison.medianRatio} |\n`;
      markdown += `| Percentage Difference | ${result.comparison.percentageDiff}% |\n`;
      markdown += `| Winner | **${result.comparison.winner}** |\n\n`;
    }
    
    return markdown;
  }

  /**
   * Generate a Markdown comparison report
   * 
   * @param results - The benchmark results
   * @param options - Report options
   * @returns Markdown formatted comparison report
   */
  private generateMarkdownComparisonReport(results: BenchmarkResult[], options: ReportOptions): string {
    const title = options.title || 'Benchmark Comparison Report';
    const description = options.description || 'Comparison of multiple benchmark results';
    
    let markdown = `# ${title}\n\n`;
    markdown += `${description}\n\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
    
    results.forEach((result, index) => {
      markdown += `## Benchmark ${index + 1}: ${result.name}\n\n`;
      markdown += `${result.description || ''}\n\n`;
      markdown += `**Date:** ${new Date(result.timestamp).toLocaleString()}\n\n`;
      
      markdown += `### Results\n\n`;
      
      if (result.mongodb) {
        markdown += this.databaseResultToMarkdownTable('MongoDB', result.mongodb);
      }
      
      if (result.postgresql) {
        markdown += this.databaseResultToMarkdownTable('PostgreSQL', result.postgresql);
      }
      
      markdown += '\n';
    });
    
    return markdown;
  }

  /**
   * Generate a text report
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns Text formatted report
   */
  private generateTextReport(result: BenchmarkResult, options: ReportOptions): string {
    const title = options.title || 'Benchmark Report';
    const description = options.description || '';
    
    let text = `${title}\n`;
    text += `${'='.repeat(title.length)}\n\n`;
    text += `${description}\n\n`;
    text += `Benchmark: ${result.name}\n`;
    text += `${'-'.repeat(12 + result.name.length)}\n\n`;
    text += `${result.description || ''}\n\n`;
    text += `Date: ${new Date(result.timestamp).toLocaleString()}\n\n`;
    
    text += `Environment:\n`;
    text += `  OS: ${result.environment.os.type} ${result.environment.os.platform} ${result.environment.os.release} (${result.environment.os.architecture})\n`;
    text += `  Node.js: ${result.environment.nodejs.version}\n`;
    text += `  Database: ${result.environment.database.type} ${result.environment.database.version}\n\n`;
    
    text += `Results:\n`;
    
    if (result.mongodb) {
      text += this.databaseResultToText('MongoDB', result.mongodb);
    }
    
    if (result.postgresql) {
      text += this.databaseResultToText('PostgreSQL', result.postgresql);
    }
    
    if (result.comparison && options.includeComparison) {
      text += `\nComparison:\n`;
      text += `  Mean Difference: ${result.comparison.meanDiffMs} ms\n`;
      text += `  Median Difference: ${result.comparison.medianDiffMs} ms\n`;
      text += `  Median Ratio: ${result.comparison.medianRatio}\n`;
      text += `  Percentage Difference: ${result.comparison.percentageDiff}%\n`;
      text += `  Winner: ${result.comparison.winner}\n`;
    }
    
    return text;
  }

  /**
   * Generate a text comparison report
   * 
   * @param results - The benchmark results
   * @param options - Report options
   * @returns Text formatted comparison report
   */
  private generateTextComparisonReport(results: BenchmarkResult[], options: ReportOptions): string {
    const title = options.title || 'Benchmark Comparison Report';
    const description = options.description || 'Comparison of multiple benchmark results';
    
    let text = `${title}\n`;
    text += `${'='.repeat(title.length)}\n\n`;
    text += `${description}\n\n`;
    text += `Date: ${new Date().toLocaleString()}\n\n`;
    
    results.forEach((result, index) => {
      text += `Benchmark ${index + 1}: ${result.name}\n`;
      text += `${'-'.repeat(14 + result.name.length)}\n\n`;
      text += `${result.description || ''}\n\n`;
      text += `Date: ${new Date(result.timestamp).toLocaleString()}\n\n`;
      
      text += `Results:\n`;
      
      if (result.mongodb) {
        text += this.databaseResultToText('MongoDB', result.mongodb);
      }
      
      if (result.postgresql) {
        text += this.databaseResultToText('PostgreSQL', result.postgresql);
      }
      
      text += '\n\n';
    });
    
    return text;
  }

  /**
   * Prepare report data
   * 
   * @param result - The benchmark result
   * @param options - Report options
   * @returns Prepared report data
   */
  private prepareReportData(result: BenchmarkResult, options: ReportOptions): any {
    const reportData: any = {
      name: result.name,
      description: result.description,
      timestamp: result.timestamp,
      environment: result.environment
    };
    
    if (result.mongodb) {
      reportData.mongodb = options.detailed
        ? result.mongodb
        : this.simplifyDatabaseResult(result.mongodb);
    }
    
    if (result.postgresql) {
      reportData.postgresql = options.detailed
        ? result.postgresql
        : this.simplifyDatabaseResult(result.postgresql);
    }
    
    if (result.comparison && options.includeComparison) {
      reportData.comparison = result.comparison;
    }
    
    return reportData;
  }

  /**
   * Simplify database result for non-detailed reports
   * 
   * @param dbResult - The database benchmark result
   * @returns Simplified database result
   */
  private simplifyDatabaseResult(dbResult: any): any {
    return {
      databaseType: dbResult.databaseType,
      statistics: dbResult.statistics,
      operation: dbResult.operation
    };
  }

  /**
   * Convert database result to CSV line
   * 
   * @param benchmarkName - The benchmark name
   * @param dbType - The database type
   * @param dbResult - The database benchmark result
   * @returns CSV line
   */
  private databaseResultToCsvLine(benchmarkName: string, dbType: string, dbResult: any): string {
    const stats = dbResult.statistics;
    const p95 = stats.p95DurationMs !== undefined ? stats.p95DurationMs : '';
    const p99 = stats.p99DurationMs !== undefined ? stats.p99DurationMs : '';
    
    return `"${benchmarkName}","${dbType}","${dbResult.operation.type}",` +
           `${stats.minDurationMs},${stats.maxDurationMs},${stats.meanDurationMs},` +
           `${stats.medianDurationMs},${stats.stdDevDurationMs},${p95},${p99}`;
  }

  /**
   * Convert database result to HTML table
   * 
   * @param dbType - The database type
   * @param dbResult - The database benchmark result
   * @returns HTML table
   */
  private databaseResultToHtmlTable(dbType: string, dbResult: any): string {
    const stats = dbResult.statistics;
    
    let html = `
      <h4>${dbType} (${dbResult.operation.type})</h4>
      <table>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr><td>Min Duration</td><td>${stats.minDurationMs} ms</td></tr>
        <tr><td>Max Duration</td><td>${stats.maxDurationMs} ms</td></tr>
        <tr><td>Mean Duration</td><td>${stats.meanDurationMs} ms</td></tr>
        <tr><td>Median Duration</td><td>${stats.medianDurationMs} ms</td></tr>
        <tr><td>Standard Deviation</td><td>${stats.stdDevDurationMs} ms</td></tr>
    `;
    
    if (stats.p95DurationMs !== undefined) {
      html += `<tr><td>95th Percentile</td><td>${stats.p95DurationMs} ms</td></tr>`;
    }
    
    if (stats.p99DurationMs !== undefined) {
      html += `<tr><td>99th Percentile</td><td>${stats.p99DurationMs} ms</td></tr>`;
    }
    
    if (stats.coefficientOfVariation !== undefined) {
      html += `<tr><td>Coefficient of Variation</td><td>${stats.coefficientOfVariation}</td></tr>`;
    }
    
    html += `
      </table>
    `;
    
    return html;
  }

  /**
   * Convert database result to Markdown table
   * 
   * @param dbType - The database type
   * @param dbResult - The database benchmark result
   * @returns Markdown table
   */
  private databaseResultToMarkdownTable(dbType: string, dbResult: any): string {
    const stats = dbResult.statistics;
    
    let markdown = `#### ${dbType} (${dbResult.operation.type})\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `| ------ | ----- |\n`;
    markdown += `| Min Duration | ${stats.minDurationMs} ms |\n`;
    markdown += `| Max Duration | ${stats.maxDurationMs} ms |\n`;
    markdown += `| Mean Duration | ${stats.meanDurationMs} ms |\n`;
    markdown += `| Median Duration | ${stats.medianDurationMs} ms |\n`;
    markdown += `| Standard Deviation | ${stats.stdDevDurationMs} ms |\n`;
    
    if (stats.p95DurationMs !== undefined) {
      markdown += `| 95th Percentile | ${stats.p95DurationMs} ms |\n`;
    }
    
    if (stats.p99DurationMs !== undefined) {
      markdown += `| 99th Percentile | ${stats.p99DurationMs} ms |\n`;
    }
    
    if (stats.coefficientOfVariation !== undefined) {
      markdown += `| Coefficient of Variation | ${stats.coefficientOfVariation} |\n`;
    }
    
    markdown += '\n';
    
    return markdown;
  }

  /**
   * Convert database result to text
   * 
   * @param dbType - The database type
   * @param dbResult - The database benchmark result
   * @returns Text representation
   */
  private databaseResultToText(dbType: string, dbResult: any): string {
    const stats = dbResult.statistics;
    
    let text = `\n  ${dbType} (${dbResult.operation.type}):\n`;
    text += `    Min Duration: ${stats.minDurationMs} ms\n`;
    text += `    Max Duration: ${stats.maxDurationMs} ms\n`;
    text += `    Mean Duration: ${stats.meanDurationMs} ms\n`;
    text += `    Median Duration: ${stats.medianDurationMs} ms\n`;
    text += `    Standard Deviation: ${stats.stdDevDurationMs} ms\n`;
    
    if (stats.p95DurationMs !== undefined) {
      text += `    95th Percentile: ${stats.p95DurationMs} ms\n`;
    }
    
    if (stats.p99DurationMs !== undefined) {
      text += `    99th Percentile: ${stats.p99DurationMs} ms\n`;
    }
    
    if (stats.coefficientOfVariation !== undefined) {
      text += `    Coefficient of Variation: ${stats.coefficientOfVariation}\n`;
    }
    
    return text;
  }

  /**
   * Generate comparison data between multiple benchmark results
   * 
   * @param results - The benchmark results
   * @returns Comparison data
   */
  private generateComparisonData(results: BenchmarkResult[]): any[] {
    const comparisons: any[] = [];
    
    // Compare each pair of results
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];
        
        // Compare MongoDB results if both have them
        if (result1.mongodb && result2.mongodb) {
          comparisons.push(this.compareResults(
            `${result1.name} vs ${result2.name} (MongoDB)`,
            result1.mongodb.statistics,
            result2.mongodb.statistics
          ));
        }
        
        // Compare PostgreSQL results if both have them
        if (result1.postgresql && result2.postgresql) {
          comparisons.push(this.compareResults(
            `${result1.name} vs ${result2.name} (PostgreSQL)`,
            result1.postgresql.statistics,
            result2.postgresql.statistics
          ));
        }
      }
    }
    
    return comparisons;
  }

  /**
   * Compare two sets of statistics
   * 
   * @param name - The comparison name
   * @param stats1 - The first set of statistics
   * @param stats2 - The second set of statistics
   * @returns Comparison data
   */
  private compareResults(name: string, stats1: any, stats2: any): any {
    const meanDiffMs = stats2.meanDurationMs - stats1.meanDurationMs;
    const medianDiffMs = stats2.medianDurationMs - stats1.medianDurationMs;
    const medianRatio = stats2.medianDurationMs / stats1.medianDurationMs;
    const percentageDiff = ((medianRatio - 1) * 100).toFixed(2);
    
    return {
      name,
      meanDiffMs,
      medianDiffMs,
      medianRatio,
      percentageDiff,
      winner: medianRatio < 1 ? 'Second' : 'First'
    };
  }
} 