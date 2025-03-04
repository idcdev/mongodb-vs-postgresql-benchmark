/**
 * DefaultCLIHandler Tests
 * 
 * Unit tests for the DefaultCLIHandler implementation.
 */

import { DefaultCLIHandler } from './default-cli-handler';
import { DataSize } from '../../domain/model/benchmark-options';

// Mock chalk module
jest.mock('chalk', () => ({
  cyan: jest.fn(text => text),
  green: jest.fn(text => text),
  yellow: jest.fn(text => text),
  red: jest.fn(text => text),
  white: jest.fn(text => text),
  blue: jest.fn(text => text),
  bold: jest.fn(text => text)
}));

// Mocking interfaces to avoid dependency on actual implementations
interface MockConfigProvider {
  get: jest.Mock;
  set: jest.Mock;
  has: jest.Mock;
  getAll: jest.Mock;
}

interface MockEventEmitter {
  on: jest.Mock;
  once: jest.Mock;
  off: jest.Mock;
  emit: jest.Mock;
  emittedEvents: Array<{ event: string; data: any }>;
}

interface MockBenchmark {
  getName: jest.Mock;
  getDescription: jest.Mock;
  getSupportedDatabases: jest.Mock;
  supportsDatabase: jest.Mock;
  getDefaultOptions: jest.Mock;
  setup: jest.Mock;
  cleanup: jest.Mock;
  run: jest.Mock;
}

interface MockBenchmarkService {
  registerDatabaseAdapter: jest.Mock;
  registerBenchmark: jest.Mock;
  unregisterBenchmark: jest.Mock;
  hasBenchmark: jest.Mock;
  getBenchmark: jest.Mock;
  getAllBenchmarks: jest.Mock;
  runBenchmark: jest.Mock;
  runAllBenchmarks: jest.Mock;
  runBenchmarkWithDatabase: jest.Mock;
  compareBenchmarkResults: jest.Mock;
  saveBenchmarkResult: jest.Mock;
}

// Spy on console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('DefaultCLIHandler', () => {
  let cliHandler: DefaultCLIHandler;
  let configProvider: MockConfigProvider;
  let eventEmitter: MockEventEmitter;
  let benchmarkService: MockBenchmarkService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock implementations
    configProvider = {
      get: jest.fn().mockImplementation((key, defaultValue) => {
        if (key === 'package') {
          return {
            name: 'Test App',
            version: '1.0.0',
            description: 'Test application'
          };
        }
        return defaultValue;
      }),
      set: jest.fn().mockReturnThis(),
      has: jest.fn().mockReturnValue(true),
      getAll: jest.fn().mockReturnValue({})
    };

    eventEmitter = {
      on: jest.fn().mockReturnValue(() => {}),
      once: jest.fn().mockReturnValue(() => {}),
      off: jest.fn().mockReturnValue(true),
      emit: jest.fn(),
      emittedEvents: []
    };

    // Track emitted events
    eventEmitter.emit.mockImplementation((event, data) => {
      eventEmitter.emittedEvents.push({ event, data });
      return Promise.resolve();
    });

    const mockBenchmark1: MockBenchmark = {
      getName: jest.fn().mockReturnValue('insert'),
      getDescription: jest.fn().mockReturnValue('Insert benchmark'),
      getSupportedDatabases: jest.fn().mockReturnValue(['mongodb', 'postgresql']),
      supportsDatabase: jest.fn().mockImplementation(db => db === 'mongodb' || db === 'postgresql'),
      getDefaultOptions: jest.fn().mockReturnValue({ size: DataSize.SMALL, iterations: 5 }),
      setup: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue({ success: true })
    };

    const mockBenchmark2: MockBenchmark = {
      getName: jest.fn().mockReturnValue('query'),
      getDescription: jest.fn().mockReturnValue('Query benchmark'),
      getSupportedDatabases: jest.fn().mockReturnValue(['mongodb', 'postgresql']),
      supportsDatabase: jest.fn().mockImplementation(db => db === 'mongodb' || db === 'postgresql'),
      getDefaultOptions: jest.fn().mockReturnValue({ size: DataSize.SMALL, iterations: 5 }),
      setup: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue({ success: true })
    };

    const mockBenchmark3: MockBenchmark = {
      getName: jest.fn().mockReturnValue('update'),
      getDescription: jest.fn().mockReturnValue('Update benchmark'),
      getSupportedDatabases: jest.fn().mockReturnValue(['mongodb']),
      supportsDatabase: jest.fn().mockImplementation(db => db === 'mongodb'),
      getDefaultOptions: jest.fn().mockReturnValue({ size: DataSize.SMALL, iterations: 5 }),
      setup: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue({ success: true })
    };

    benchmarkService = {
      registerDatabaseAdapter: jest.fn(),
      registerBenchmark: jest.fn().mockReturnValue(true),
      unregisterBenchmark: jest.fn(),
      hasBenchmark: jest.fn().mockImplementation(name => 
        ['insert', 'query', 'update'].includes(name)
      ),
      getBenchmark: jest.fn().mockImplementation(name => {
        if (name === 'insert') return mockBenchmark1;
        if (name === 'query') return mockBenchmark2;
        if (name === 'update') return mockBenchmark3;
        return null;
      }),
      getAllBenchmarks: jest.fn().mockReturnValue([mockBenchmark1, mockBenchmark2, mockBenchmark3]),
      runBenchmark: jest.fn().mockResolvedValue({
        mongodb: {
          statistics: {
            meanDurationMs: 100,
            medianDurationMs: 95
          }
        },
        postgresql: {
          statistics: {
            meanDurationMs: 120,
            medianDurationMs: 115
          }
        },
        comparison: {
          winner: 'mongodb',
          percentageDiff: -20
        }
      }),
      runAllBenchmarks: jest.fn().mockResolvedValue({
        test: {
          mongodb: {
            statistics: {
              meanDurationMs: 100,
              medianDurationMs: 95
            }
          },
          postgresql: {
            statistics: {
              meanDurationMs: 120,
              medianDurationMs: 115
            }
          },
          comparison: {
            winner: 'mongodb',
            percentageDiff: -20
          }
        }
      }),
      runBenchmarkWithDatabase: jest.fn().mockResolvedValue({
        statistics: {
          meanDurationMs: 100,
          medianDurationMs: 95
        }
      }),
      compareBenchmarkResults: jest.fn().mockReturnValue({
        winner: 'mongodb',
        percentageDiff: -20
      }),
      saveBenchmarkResult: jest.fn().mockResolvedValue(undefined)
    };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Cast mocks to satisfy TypeScript
    cliHandler = new DefaultCLIHandler(
      configProvider as any,
      eventEmitter as any,
      benchmarkService as any
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Constructor', () => {
    it('should initialize with default commands', () => {
      const commands = cliHandler.getCommands();
      expect(commands.length).toBeGreaterThan(0);
      
      const commandNames = commands.map(cmd => cmd.name);
      expect(commandNames).toContain('help');
      expect(commandNames).toContain('version');
      expect(commandNames).toContain('list');
      expect(commandNames).toContain('run');
    });

    it('should register event listeners', () => {
      expect(eventEmitter.on).toHaveBeenCalledWith('benchmark:started', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('benchmark:completed', expect.any(Function));
      expect(eventEmitter.on).toHaveBeenCalledWith('benchmark:error', expect.any(Function));
    });
  });

  describe('Command Registration', () => {
    it('should register a command', () => {
      const command = {
        name: 'test',
        description: 'Test command',
        action: jest.fn()
      };

      cliHandler.registerCommand(command);
      const commands = cliHandler.getCommands();
      
      expect(commands.find(cmd => cmd.name === 'test')).toBeDefined();
    });

    it('should register command aliases', () => {
      const command = {
        name: 'test',
        description: 'Test command',
        aliases: ['t', 'tst'],
        action: jest.fn()
      };

      cliHandler.registerCommand(command);

      // Execute command using its alias
      cliHandler.executeCommand('t');
      expect(command.action).toHaveBeenCalled();
    });

    it('should register subcommands', () => {
      const childAction = jest.fn();
      const command = {
        name: 'parent',
        description: 'Parent command',
        action: jest.fn(),
        subcommands: [
          {
            name: 'child',
            description: 'Child command',
            action: childAction
          }
        ]
      };

      cliHandler.registerCommand(command);
      
      // Execute the subcommand directly
      cliHandler.executeCommand('parent:child');
      
      // Check that the subcommand action was executed
      expect(childAction).toHaveBeenCalled();
    });
  });

  describe('Argument Parsing', () => {
    it('should parse command and options', () => {
      const args = ['node', 'app.js', 'run', '--size', 'large', '--iterations', '10'];
      const result = cliHandler.parseArgs(args);
      
      expect(result.command).toBe('run');
      expect(result.options.size).toBe('large');
      expect(result.options.iterations).toBe('10');
    });

    it('should handle options with equals sign', () => {
      const args = ['node', 'app.js', 'run', '--size=large', '--iterations=10'];
      const result = cliHandler.parseArgs(args);
      
      expect(result.command).toBe('run');
      expect(result.options.size).toBe('large');
      expect(result.options.iterations).toBe('10');
    });

    it('should handle short options', () => {
      const args = ['node', 'app.js', 'run', '-s', 'large', '-i', '10'];
      const result = cliHandler.parseArgs(args);
      
      expect(result.command).toBe('run');
      expect(result.options.s).toBe('large');
      expect(result.options.i).toBe('10');
    });

    it('should use help command when no command provided', () => {
      const args = ['node', 'app.js'];
      const result = cliHandler.parseArgs(args);
      
      expect(result.command).toBe('help');
      expect(Object.keys(result.options).length).toBe(0);
    });

    it('should handle subcommands in colon format', () => {
      const args = ['node', 'app.js', 'run:mongodb', 'insert'];
      const result = cliHandler.parseArgs(args);
      
      expect(result.command).toBe('run:mongodb');
      expect(result.options.benchmark).toBe('insert');
    });
  });

  describe('Command Execution', () => {
    it('should execute a command', async () => {
      const action = jest.fn();
      cliHandler.registerCommand({
        name: 'test',
        description: 'Test command',
        action
      });
      
      await cliHandler.executeCommand('test', { option1: 'value1' });
      
      expect(action).toHaveBeenCalledWith({ option1: 'value1' });
    });

    it('should handle command errors', async () => {
      const error = new Error('Test error');
      const action = jest.fn().mockRejectedValue(error);
      
      cliHandler.registerCommand({
        name: 'error',
        description: 'Error command',
        action
      });
      
      await cliHandler.executeCommand('error');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(eventEmitter.emittedEvents).toContainEqual({
        event: 'cli:error',
        data: expect.objectContaining({
          command: 'error',
          error
        })
      });
    });

    it('should handle unknown commands', async () => {
      await cliHandler.executeCommand('unknown');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });
  });

  describe('CLI Running', () => {
    it('should run the CLI with provided args', async () => {
      const args = ['node', 'app.js', 'version'];
      
      await cliHandler.run(args);
      
      // Check that events were emitted
      expect(eventEmitter.emittedEvents).toContainEqual({
        event: 'cli:started',
        data: expect.objectContaining({
          command: 'version'
        })
      });
      
      expect(eventEmitter.emittedEvents).toContainEqual({
        event: 'cli:finished',
        data: expect.objectContaining({
          command: 'version'
        })
      });
      
      // Check that version info was printed
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Help Command', () => {
    it('should print general help information', () => {
      cliHandler.printHelp();
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should print help for a specific command', () => {
      cliHandler.printHelp('run');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle unknown command in help', () => {
      cliHandler.printHelp('unknown');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
    });
  });

  describe('Version Command', () => {
    it('should print version information', () => {
      cliHandler.printVersion();
      
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(configProvider.get).toHaveBeenCalledWith('package', expect.any(Object));
    });
  });

  describe('Benchmark Commands', () => {
    it('should list available benchmarks', async () => {
      await cliHandler.executeCommand('list');
      
      expect(benchmarkService.getAllBenchmarks).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should run a benchmark', async () => {
      await cliHandler.executeCommand('run', { benchmark: 'insert' });
      
      expect(benchmarkService.hasBenchmark).toHaveBeenCalledWith('insert');
      expect(benchmarkService.runBenchmark).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should run all benchmarks when no name provided', async () => {
      await cliHandler.executeCommand('run');
      
      expect(benchmarkService.runAllBenchmarks).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should show error for non-existent benchmark', async () => {
      benchmarkService.hasBenchmark.mockReturnValueOnce(false);
      
      await cliHandler.executeCommand('run', { benchmark: 'nonexistent' });
      
      expect(benchmarkService.hasBenchmark).toHaveBeenCalledWith('nonexistent');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
}); 