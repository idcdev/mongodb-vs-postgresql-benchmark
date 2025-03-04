/**
 * Metrics Service Interface
 * 
 * This interface defines the contract for the metrics service,
 * which is responsible for collecting and analyzing metrics during benchmark execution.
 */

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Metric value types
 */
export type MetricValue = number | { [key: string]: number };

/**
 * Metric data structure
 */
export interface Metric {
  /**
   * Name of the metric
   */
  name: string;
  
  /**
   * Type of the metric
   */
  type: MetricType;
  
  /**
   * Value of the metric
   */
  value: MetricValue;
  
  /**
   * Tags/labels for the metric
   */
  tags?: Record<string, string>;
  
  /**
   * Timestamp when the metric was recorded
   */
  timestamp?: Date;
  
  /**
   * Description of the metric
   */
  description?: string;
  
  /**
   * Unit of measurement
   */
  unit?: string;
}

/**
 * Timer options
 */
export interface TimerOptions {
  /**
   * Tags/labels for the timer
   */
  tags?: Record<string, string>;
  
  /**
   * Description of the timer
   */
  description?: string;
}

/**
 * Core metrics service interface
 */
export interface MetricsService {
  /**
   * Record a counter metric
   * 
   * @param name - Name of the counter
   * @param value - Value to increment by (default: 1)
   * @param tags - Optional tags/labels
   * @returns The current counter value
   */
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): number;
  
  /**
   * Record a gauge metric
   * 
   * @param name - Name of the gauge
   * @param value - Value to set
   * @param tags - Optional tags/labels
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  
  /**
   * Record a histogram value
   * 
   * @param name - Name of the histogram
   * @param value - Value to record
   * @param tags - Optional tags/labels
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  
  /**
   * Start a timer
   * 
   * @param name - Name of the timer
   * @param options - Timer options
   * @returns A function that stops the timer and returns the elapsed time in milliseconds
   */
  startTimer(name: string, options?: TimerOptions): () => number;
  
  /**
   * Record a timer directly
   * 
   * @param name - Name of the timer
   * @param valueMs - Time value in milliseconds
   * @param tags - Optional tags/labels
   */
  recordTimer(name: string, valueMs: number, tags?: Record<string, string>): void;
  
  /**
   * Get all metrics
   * 
   * @returns All recorded metrics
   */
  getMetrics(): Metric[];
  
  /**
   * Get a specific metric by name
   * 
   * @param name - Name of the metric
   * @returns The metric or null if not found
   */
  getMetric(name: string): Metric | null;
  
  /**
   * Reset all metrics
   */
  resetMetrics(): void;
  
  /**
   * Reset a specific metric
   * 
   * @param name - Name of the metric to reset
   */
  resetMetric(name: string): void;
  
  /**
   * Calculate statistics for a histogram metric
   * 
   * @param name - Name of the histogram
   * @returns Statistics including min, max, mean, median, and percentiles
   */
  getHistogramStats(name: string): Record<string, number> | null;
  
  /**
   * Register a callback to be called when metrics are updated
   * 
   * @param callback - The callback function
   * @returns A function that unregisters the callback
   */
  onUpdate(callback: (metrics: Metric[]) => void): () => void;
} 