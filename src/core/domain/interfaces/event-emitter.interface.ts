/**
 * Event Emitter Interface
 * 
 * This interface defines the contract for event emitters in the application.
 * It enables loose coupling between components through events.
 */

/**
 * Type for event handlers
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Core event emitter interface
 */
export interface EventEmitter {
  /**
   * Register an event handler
   * 
   * @param eventName - The name of the event to listen for
   * @param handler - The function to call when the event is emitted
   * @returns A function to remove the listener
   */
  on<T = any>(eventName: string, handler: EventHandler<T>): () => void;
  
  /**
   * Register an event handler that is called only once
   * 
   * @param eventName - The name of the event to listen for
   * @param handler - The function to call when the event is emitted
   * @returns A function to remove the listener
   */
  once<T = any>(eventName: string, handler: EventHandler<T>): () => void;
  
  /**
   * Emit an event
   * 
   * @param eventName - The name of the event to emit
   * @param data - The data to pass to event handlers
   * @returns A promise that resolves when all handlers have completed
   */
  emit<T = any>(eventName: string, data?: T): Promise<void>;
  
  /**
   * Remove an event handler
   * 
   * @param eventName - The name of the event
   * @param handler - The handler function to remove
   * @returns true if the handler was removed, false otherwise
   */
  off<T = any>(eventName: string, handler: EventHandler<T>): boolean;
  
  /**
   * Remove all event listeners for a specific event
   * 
   * @param eventName - The name of the event
   * @returns The number of listeners removed
   */
  removeAllListeners(eventName?: string): number;
  
  /**
   * Get all registered listeners for an event
   * 
   * @param eventName - The name of the event
   * @returns Array of handler functions
   */
  listeners(eventName: string): EventHandler[];
  
  /**
   * Check if an event has listeners
   * 
   * @param eventName - The name of the event
   * @returns true if the event has listeners, false otherwise
   */
  hasListeners(eventName: string): boolean;
} 