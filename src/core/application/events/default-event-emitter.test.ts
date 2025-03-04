import { DefaultEventEmitter } from './default-event-emitter';
import { EventHandler } from '../../domain/interfaces';

describe('DefaultEventEmitter', () => {
  let emitter: DefaultEventEmitter;

  beforeEach(() => {
    emitter = new DefaultEventEmitter();
  });

  describe('on', () => {
    it('should register an event handler', () => {
      const handler = jest.fn();
      emitter.on('test', handler);
      expect(emitter.hasListeners('test')).toBe(true);
      expect(emitter.listeners('test')).toHaveLength(1);
      expect(emitter.listeners('test')[0]).toBe(handler);
    });

    it('should not register the same handler twice', () => {
      const handler = jest.fn();
      emitter.on('test', handler);
      emitter.on('test', handler);
      expect(emitter.listeners('test')).toHaveLength(1);
    });

    it('should return a function to unregister the handler', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.on('test', handler);
      
      expect(emitter.hasListeners('test')).toBe(true);
      unsubscribe();
      expect(emitter.hasListeners('test')).toBe(false);
    });

    it('should throw an error if event name or handler is invalid', () => {
      expect(() => emitter.on('', jest.fn())).toThrow();
      expect(() => emitter.on('test', null as unknown as EventHandler)).toThrow();
    });
  });

  describe('once', () => {
    it('should register a one-time event handler', () => {
      const handler = jest.fn();
      emitter.once('test', handler);
      expect(emitter.hasListeners('test')).toBe(true);
    });

    it('should return a function to unregister the handler', () => {
      const handler = jest.fn();
      const unsubscribe = emitter.once('test', handler);
      
      expect(emitter.hasListeners('test')).toBe(true);
      unsubscribe();
      expect(emitter.hasListeners('test')).toBe(false);
    });
  });

  describe('emit', () => {
    it('should invoke all handlers for an event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      
      await emitter.emit('test', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should invoke one-time handlers only once', async () => {
      const handler = jest.fn();
      
      emitter.once('test', handler);
      
      await emitter.emit('test', 'data1');
      await emitter.emit('test', 'data2');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('data1');
    });

    it('should handle async handlers', async () => {
      const result: string[] = [];
      
      const asyncHandler1 = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        result.push('handler1');
      };
      
      const asyncHandler2 = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        result.push('handler2');
      };
      
      emitter.on('test', asyncHandler1);
      emitter.on('test', asyncHandler2);
      
      await emitter.emit('test');
      
      // Both handlers should complete, but the order isn't guaranteed
      expect(result).toContain('handler1');
      expect(result).toContain('handler2');
      expect(result).toHaveLength(2);
    });

    it('should handle errors in handlers without stopping emission', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const goodHandler = jest.fn();
      const badHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      emitter.on('test', badHandler);
      emitter.on('test', goodHandler);
      
      await emitter.emit('test');
      
      expect(badHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should do nothing if no handlers exist for an event', async () => {
      await expect(emitter.emit('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('off', () => {
    it('should remove an event handler', () => {
      const handler = jest.fn();
      
      emitter.on('test', handler);
      expect(emitter.hasListeners('test')).toBe(true);
      
      const result = emitter.off('test', handler);
      
      expect(result).toBe(true);
      expect(emitter.hasListeners('test')).toBe(false);
    });

    it('should return false if the handler was not found', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('test', handler1);
      
      const result = emitter.off('test', handler2);
      
      expect(result).toBe(false);
      expect(emitter.hasListeners('test')).toBe(true);
    });

    it('should return false if the event name was not found', () => {
      const result = emitter.off('nonexistent', jest.fn());
      expect(result).toBe(false);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for a specific event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('test1', handler1);
      emitter.on('test1', handler2);
      emitter.on('test2', handler1);
      
      const removedCount = emitter.removeAllListeners('test1');
      
      expect(removedCount).toBe(2);
      expect(emitter.hasListeners('test1')).toBe(false);
      expect(emitter.hasListeners('test2')).toBe(true);
    });

    it('should remove all listeners for all events if no event name is provided', () => {
      emitter.on('test1', jest.fn());
      emitter.on('test1', jest.fn());
      emitter.on('test2', jest.fn());
      
      const removedCount = emitter.removeAllListeners();
      
      expect(removedCount).toBe(3);
      expect(emitter.hasListeners('test1')).toBe(false);
      expect(emitter.hasListeners('test2')).toBe(false);
    });

    it('should return 0 if no listeners exist for the event', () => {
      const removedCount = emitter.removeAllListeners('nonexistent');
      expect(removedCount).toBe(0);
    });
  });

  describe('listeners', () => {
    it('should return all listeners for an event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      emitter.on('test', handler1);
      emitter.on('test', handler2);
      
      const listeners = emitter.listeners('test');
      
      expect(listeners).toHaveLength(2);
      expect(listeners).toContain(handler1);
      expect(listeners).toContain(handler2);
    });

    it('should return an empty array if no listeners exist for the event', () => {
      const listeners = emitter.listeners('nonexistent');
      expect(listeners).toEqual([]);
    });
  });

  describe('hasListeners', () => {
    it('should return true if the event has listeners', () => {
      emitter.on('test', jest.fn());
      expect(emitter.hasListeners('test')).toBe(true);
    });

    it('should return false if the event has no listeners', () => {
      expect(emitter.hasListeners('nonexistent')).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle complex event flows', async () => {
      const results: string[] = [];
      
      // Regular handler that stays registered
      const regularHandler = jest.fn().mockImplementation(() => {
        results.push('regular');
      });
      
      // Once handler that removes itself after first call
      const onceHandler = jest.fn().mockImplementation(() => {
        results.push('once');
      });
      
      // Handler that registers another handler when called
      const registeringHandler = jest.fn().mockImplementation(() => {
        results.push('registering');
        emitter.on('secondEvent', () => {
          results.push('dynamicHandler');
        });
      });
      
      // Handler that unregisters another handler when called
      const unsubscribe = emitter.on('firstEvent', regularHandler);
      const unregisteringHandler = jest.fn().mockImplementation(() => {
        results.push('unregistering');
        unsubscribe();
      });
      
      // Set up all handlers
      emitter.on('firstEvent', registeringHandler);
      emitter.on('firstEvent', unregisteringHandler);
      emitter.once('firstEvent', onceHandler);
      
      // Emit the first event
      await emitter.emit('firstEvent');
      
      // Check first event results
      expect(results).toContain('regular');
      expect(results).toContain('registering');
      expect(results).toContain('unregistering');
      expect(results).toContain('once');
      
      // Reset results
      results.length = 0;
      
      // Emit the first event again
      await emitter.emit('firstEvent');
      
      // Regular handler should be gone due to unregisteringHandler
      // onceHandler should be gone because it was a once handler
      expect(results).not.toContain('regular');
      expect(results).not.toContain('once');
      expect(results).toContain('registering');
      expect(results).toContain('unregistering');
      
      // Reset results
      results.length = 0;
      
      // Emit the second event
      await emitter.emit('secondEvent');
      
      // The dynamic handler registered by registeringHandler should be called
      expect(results).toContain('dynamicHandler');
    });
  });
}); 