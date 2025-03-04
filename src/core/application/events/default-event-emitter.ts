/**
 * Default Event Emitter
 * 
 * An implementation of the EventEmitter interface that provides a basic
 * pub-sub mechanism for event handling in the application.
 */

import { EventEmitter, EventHandler } from '../../domain/interfaces';

/**
 * Handler information structure
 */
interface HandlerInfo<T = any> {
  handler: EventHandler<T>;
  once: boolean;
}

/**
 * Default implementation of the EventEmitter interface
 */
export class DefaultEventEmitter implements EventEmitter {
  private eventHandlers: Map<string, HandlerInfo[]> = new Map();

  /**
   * Register an event handler
   * 
   * @param eventName - The name of the event to listen for
   * @param handler - The function to call when the event is emitted
   * @returns A function to remove the listener
   */
  public on<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    this.addListener(eventName, handler, false);
    return () => this.off(eventName, handler);
  }

  /**
   * Register an event handler that is called only once
   * 
   * @param eventName - The name of the event to listen for
   * @param handler - The function to call when the event is emitted
   * @returns A function to remove the listener
   */
  public once<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    this.addListener(eventName, handler, true);
    return () => this.off(eventName, handler);
  }

  /**
   * Emit an event
   * 
   * @param eventName - The name of the event to emit
   * @param data - The data to pass to event handlers
   * @returns A promise that resolves when all handlers have completed
   */
  public async emit<T = any>(eventName: string, data?: T): Promise<void> {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Create a copy of handlers to handle 'once' removal during emit
    const handlersToCall = [...handlers];
    
    // Remove 'once' handlers before execution to avoid recursive emit issues
    const onceHandlers = handlersToCall.filter(info => info.once);
    for (const handlerInfo of onceHandlers) {
      this.off(eventName, handlerInfo.handler);
    }

    // Execute all handlers concurrently
    await Promise.all(
      handlersToCall.map(async (handlerInfo) => {
        try {
          await handlerInfo.handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${eventName}":`, error);
        }
      })
    );
  }

  /**
   * Remove an event handler
   * 
   * @param eventName - The name of the event
   * @param handler - The handler function to remove
   * @returns true if the handler was removed, false otherwise
   */
  public off<T = any>(eventName: string, handler: EventHandler<T>): boolean {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers) {
      return false;
    }

    const initialLength = handlers.length;
    const filteredHandlers = handlers.filter(h => h.handler !== handler);
    
    if (filteredHandlers.length === initialLength) {
      return false;
    }

    if (filteredHandlers.length === 0) {
      this.eventHandlers.delete(eventName);
    } else {
      this.eventHandlers.set(eventName, filteredHandlers);
    }

    return true;
  }

  /**
   * Remove all event listeners for a specific event or all events
   * 
   * @param eventName - The name of the event (optional)
   * @returns The number of listeners removed
   */
  public removeAllListeners(eventName?: string): number {
    let count = 0;

    if (eventName) {
      const handlers = this.eventHandlers.get(eventName);
      if (handlers) {
        count = handlers.length;
        this.eventHandlers.delete(eventName);
      }
    } else {
      // Count all handlers and clear the map
      for (const handlers of this.eventHandlers.values()) {
        count += handlers.length;
      }
      this.eventHandlers.clear();
    }

    return count;
  }

  /**
   * Get all registered listeners for an event
   * 
   * @param eventName - The name of the event
   * @returns Array of handler functions
   */
  public listeners(eventName: string): EventHandler[] {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers) {
      return [];
    }
    return handlers.map(h => h.handler);
  }

  /**
   * Check if an event has listeners
   * 
   * @param eventName - The name of the event
   * @returns true if the event has listeners, false otherwise
   */
  public hasListeners(eventName: string): boolean {
    const handlers = this.eventHandlers.get(eventName);
    return !!handlers && handlers.length > 0;
  }

  /**
   * Add an event listener
   * 
   * @param eventName - The name of the event
   * @param handler - The handler function
   * @param once - Whether this handler should only be called once
   */
  private addListener<T = any>(eventName: string, handler: EventHandler<T>, once: boolean): void {
    if (!eventName || typeof handler !== 'function') {
      throw new Error('Event name and handler function are required');
    }

    let handlers = this.eventHandlers.get(eventName);
    
    if (!handlers) {
      handlers = [];
      this.eventHandlers.set(eventName, handlers);
    }

    // Check if handler already exists to avoid duplicates
    const existingHandler = handlers.find(h => h.handler === handler);
    if (existingHandler) {
      // Update the 'once' flag if it's different
      if (existingHandler.once !== once) {
        existingHandler.once = once;
      }
      return;
    }

    handlers.push({ handler, once });
  }
} 