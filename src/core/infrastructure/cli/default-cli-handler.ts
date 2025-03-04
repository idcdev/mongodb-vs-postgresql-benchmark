/**
 * Default CLI Handler
 * 
 * Implementation of the CLIHandler interface for command-line operations.
 */

import { 
  CLIHandler, 
  CommandDefinition, 
  CommandOptions,
  EventEmitter,
  ConfigProvider
} from '../../domain/interfaces';
import { BenchmarkService } from '../../domain/interfaces';
import * as chalk from 'chalk';

/**
 * DefaultCLIHandler implementation
 */
export class DefaultCLIHandler implements CLIHandler {
  private commands: Map<string, CommandDefinition> = new Map();
  private aliases: Map<string, string> = new Map();
  private config: ConfigProvider;
  private eventEmitter: EventEmitter;
  private benchmarkService?: BenchmarkService;
  
  /**
   * Constructor
   * 
   * @param config - Configuration provider
   * @param eventEmitter - Event emitter
   * @param benchmarkService - Optional benchmark service
   */
  constructor(
    config: ConfigProvider, 
    eventEmitter: EventEmitter,
    benchmarkService?: BenchmarkService
  ) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.benchmarkService = benchmarkService;
    
    // Register event listeners
    this.registerEventListeners();
    
    // Register default commands
    this.registerDefaultCommands();
  }

  /**
   * Register event listeners
   */
  private registerEventListeners(): void {
    // Listen for benchmark events
    this.eventEmitter.on('benchmark:started', (data) => {
      console.log(chalk.cyan(`Benchmark started: ${data.name}`));
    });
    
    this.eventEmitter.on('benchmark:completed', (data) => {
      console.log(chalk.green(`Benchmark completed: ${data.name}`));
    });
    
    this.eventEmitter.on('benchmark:error', (data) => {
      console.error(chalk.red(`Benchmark error: ${(data.error as Error).message}`));
    });
    
    this.eventEmitter.on('benchmark:database:started', (data) => {
      console.log(chalk.cyan(`Database benchmark started: ${data.name} (${data.databaseType})`));
    });
    
    this.eventEmitter.on('benchmark:database:completed', (data) => {
      console.log(chalk.green(`Database benchmark completed: ${data.name} (${data.databaseType})`));
    });
  }

  /**
   * Register default commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: 'help',
      description: 'Display help information',
      aliases: ['h'],
      action: (options) => {
        const command = options.command as string;
        this.printHelp(command);
      }
    });
    
    // Version command
    this.registerCommand({
      name: 'version',
      description: 'Display version information',
      aliases: ['v'],
      action: () => {
        this.printVersion();
      }
    });
    
    // List benchmarks command
    if (this.benchmarkService) {
      this.registerCommand({
        name: 'list',
        description: 'List available benchmarks',
        aliases: ['ls'],
        action: () => {
          const benchmarks = this.benchmarkService!.getAllBenchmarks();
          
          if (benchmarks.length === 0) {
            console.log(chalk.yellow('No benchmarks available'));
            return;
          }
          
          console.log(chalk.cyan('Available benchmarks:'));
          benchmarks.forEach((benchmark) => {
            const name = benchmark.getName();
            const description = benchmark.getDescription();
            const databases = benchmark.getSupportedDatabases().join(', ');
            
            console.log(`  ${chalk.green(name)}: ${description}`);
            console.log(`    Supported databases: ${chalk.blue(databases)}`);
          });
        }
      });
      
      // Run benchmark command
      this.registerCommand({
        name: 'run',
        description: 'Run benchmarks',
        options: {
          size: {
            description: 'Data size (small, medium, large)',
            default: 'small'
          },
          iterations: {
            description: 'Number of iterations',
            default: 5
          },
          save: {
            description: 'Save results to file',
            default: true
          }
        },
        action: async (options) => {
          const benchmarkName = options.benchmark as string;
          
          if (!benchmarkName) {
            // Run all benchmarks
            console.log(chalk.cyan('Running all benchmarks...'));
            
            const results = await this.benchmarkService!.runAllBenchmarks({
              size: options.size,
              iterations: options.iterations ? parseInt(options.iterations) : undefined,
              saveResults: options.save === 'false' ? false : true
            });
            
            const benchmarkCount = Object.keys(results).length;
            console.log(chalk.green(`Completed ${benchmarkCount} benchmarks`));
          } else {
            // Run specific benchmark
            if (!this.benchmarkService!.hasBenchmark(benchmarkName)) {
              console.error(chalk.red(`Benchmark '${benchmarkName}' not found`));
              console.log('Use the "list" command to see available benchmarks');
              return;
            }
            
            console.log(chalk.cyan(`Running benchmark: ${benchmarkName}`));
            
            const result = await this.benchmarkService!.runBenchmark(benchmarkName, {
              size: options.size,
              iterations: options.iterations ? parseInt(options.iterations) : undefined,
              saveResults: options.save === 'false' ? false : true
            });
            
            // Display summary results
            if (result.mongodb && result.postgresql && result.comparison) {
              console.log(chalk.cyan('\nComparison Results:'));
              
              const winner = result.comparison.winner === 'mongodb' ? 'MongoDB' : 'PostgreSQL';
              const percentage = Math.abs(result.comparison.percentageDiff).toFixed(2);
              const faster = result.comparison.percentageDiff < 0 ? 'faster' : 'slower';
              
              console.log(`${chalk.green('Winner')}: ${chalk.bold(winner)}`);
              console.log(`${chalk.green('Difference')}: ${chalk.bold(percentage)}% ${faster}`);
              
              console.log(chalk.cyan('\nMongoDB Results:'));
              console.log(`${chalk.green('Mean')}: ${result.mongodb.statistics.meanDurationMs.toFixed(2)}ms`);
              console.log(`${chalk.green('Median')}: ${result.mongodb.statistics.medianDurationMs.toFixed(2)}ms`);
              
              console.log(chalk.cyan('\nPostgreSQL Results:'));
              console.log(`${chalk.green('Mean')}: ${result.postgresql.statistics.meanDurationMs.toFixed(2)}ms`);
              console.log(`${chalk.green('Median')}: ${result.postgresql.statistics.medianDurationMs.toFixed(2)}ms`);
            }
          }
        },
        subcommands: [
          {
            name: 'mongodb',
            description: 'Run benchmarks for MongoDB only',
            action: async (options) => {
              const benchmarkName = options.benchmark as string;
              
              if (!benchmarkName) {
                console.error(chalk.red('Benchmark name required'));
                return;
              }
              
              if (!this.benchmarkService!.hasBenchmark(benchmarkName)) {
                console.error(chalk.red(`Benchmark '${benchmarkName}' not found`));
                return;
              }
              
              const benchmark = this.benchmarkService!.getBenchmark(benchmarkName)!;
              
              if (!benchmark.supportsDatabase('mongodb')) {
                console.error(chalk.red(`Benchmark '${benchmarkName}' does not support MongoDB`));
                return;
              }
              
              console.log(chalk.cyan(`Running MongoDB benchmark: ${benchmarkName}`));
              
              await this.benchmarkService!.runBenchmarkWithDatabase(
                benchmarkName,
                'mongodb' as any,
                {
                  size: options.size,
                  iterations: options.iterations ? parseInt(options.iterations) : undefined,
                  saveResults: options.save === 'false' ? false : true
                }
              );
            }
          },
          {
            name: 'postgresql',
            description: 'Run benchmarks for PostgreSQL only',
            action: async (options) => {
              const benchmarkName = options.benchmark as string;
              
              if (!benchmarkName) {
                console.error(chalk.red('Benchmark name required'));
                return;
              }
              
              if (!this.benchmarkService!.hasBenchmark(benchmarkName)) {
                console.error(chalk.red(`Benchmark '${benchmarkName}' not found`));
                return;
              }
              
              const benchmark = this.benchmarkService!.getBenchmark(benchmarkName)!;
              
              if (!benchmark.supportsDatabase('postgresql')) {
                console.error(chalk.red(`Benchmark '${benchmarkName}' does not support PostgreSQL`));
                return;
              }
              
              console.log(chalk.cyan(`Running PostgreSQL benchmark: ${benchmarkName}`));
              
              await this.benchmarkService!.runBenchmarkWithDatabase(
                benchmarkName,
                'postgresql' as any,
                {
                  size: options.size,
                  iterations: options.iterations ? parseInt(options.iterations) : undefined,
                  saveResults: options.save === 'false' ? false : true
                }
              );
            }
          }
        ]
      });
    }
  }

  /**
   * Register a command
   * 
   * @param command - The command to register
   */
  public registerCommand(command: CommandDefinition): void {
    // Register command
    this.commands.set(command.name, command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach((alias) => {
        this.aliases.set(alias, command.name);
      });
    }
    
    // Register subcommands
    if (command.subcommands) {
      command.subcommands.forEach((subcommand) => {
        const fullName = `${command.name}:${subcommand.name}`;
        this.commands.set(fullName, subcommand);
      });
    }
  }

  /**
   * Get all registered commands
   * 
   * @returns Array of registered commands
   */
  public getCommands(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }
  
  /**
   * Find a command by name or alias
   * 
   * @param name - Command name or alias
   * @returns The command or undefined if not found
   */
  private findCommand(name: string): CommandDefinition | undefined {
    // Check if it's a direct command
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }
    
    // Check if it's an alias
    if (this.aliases.has(name)) {
      const commandName = this.aliases.get(name);
      return this.commands.get(commandName!);
    }
    
    // Check if it's a subcommand (format: command:subcommand)
    const parts = name.split(':');
    if (parts.length === 2) {
      const [commandName, subcommandName] = parts;
      const command = this.commands.get(commandName);
      
      if (command && command.subcommands) {
        return command.subcommands.find((subcommand) => subcommand.name === subcommandName);
      }
    }
    
    return undefined;
  }

  /**
   * Parse command-line arguments
   * 
   * @param args - Command-line arguments
   * @returns Parsed command and options
   */
  public parseArgs(args: string[]): {
    command: string;
    options: CommandOptions;
  } {
    // Remove 'node' and script name from args
    const processedArgs = args.slice(2);
    
    if (processedArgs.length === 0) {
      return {
        command: 'help',
        options: {}
      };
    }
    
    // The first argument is the command
    const commandArg = processedArgs[0];
    
    // Check if the command is a subcommand (format: command:subcommand)
    let command = commandArg;
    const subcommandSeparator = commandArg.indexOf(':');
    
    if (subcommandSeparator !== -1) {
      command = commandArg;
    } else {
      // Check if the next argument is a subcommand
      if (processedArgs.length > 1 && !processedArgs[1].startsWith('-')) {
        const mainCommand = commandArg;
        const subCommand = processedArgs[1];
        
        // Check if the subcommand is valid
        if (this.commands.has(`${mainCommand}:${subCommand}`)) {
          command = `${mainCommand}:${subCommand}`;
          processedArgs.splice(1, 1); // Remove subcommand from args
        } else if (this.commands.has(mainCommand)) {
          const commandDef = this.commands.get(mainCommand);
          
          if (commandDef && commandDef.subcommands) {
            const validSubcommand = commandDef.subcommands.find(
              (sub) => sub.name === subCommand
            );
            
            if (validSubcommand) {
              command = `${mainCommand}:${subCommand}`;
              processedArgs.splice(1, 1); // Remove subcommand from args
            }
          }
        }
      }
    }
    
    // Parse options
    const options: CommandOptions = {};
    
    for (let i = 1; i < processedArgs.length; i++) {
      const arg = processedArgs[i];
      
      if (arg.startsWith('--')) {
        // Long option (--option=value or --option value)
        const optionName = arg.substring(2);
        
        if (optionName.includes('=')) {
          const [name, value] = optionName.split('=');
          options[name] = value;
        } else {
          // Check if next arg is a value
          if (i + 1 < processedArgs.length && !processedArgs[i + 1].startsWith('-')) {
            options[optionName] = processedArgs[i + 1];
            i++; // Skip next arg
          } else {
            options[optionName] = true;
          }
        }
      } else if (arg.startsWith('-')) {
        // Short option (-o value or -o)
        const optionName = arg.substring(1);
        
        // Check if next arg is a value
        if (i + 1 < processedArgs.length && !processedArgs[i + 1].startsWith('-')) {
          options[optionName] = processedArgs[i + 1];
          i++; // Skip next arg
        } else {
          options[optionName] = true;
        }
      } else {
        // Positional argument
        if (!options.benchmark) {
          options.benchmark = arg;
        } else {
          // Append to benchmark name (e.g. "run insert" -> benchmark = "insert")
          options.benchmark = arg;
        }
      }
    }
    
    return {
      command,
      options
    };
  }

  /**
   * Execute a command
   * 
   * @param command - Command name
   * @param options - Command options
   * @returns A promise that resolves when the command is executed
   */
  public async executeCommand(
    command: string, 
    options: CommandOptions = {}
  ): Promise<void> {
    const commandDef = this.findCommand(command);
    
    if (!commandDef) {
      console.error(chalk.red(`Unknown command: ${command}`));
      console.log('Run "help" to see available commands');
      return;
    }
    
    try {
      await commandDef.action(options);
    } catch (error) {
      console.error(chalk.red(`Error executing command '${command}': ${(error as Error).message}`));
      
      // Emit error event
      this.eventEmitter.emit('cli:error', {
        command,
        error
      });
    }
  }

  /**
   * Run the CLI
   * 
   * @param args - Command-line arguments (default: process.argv)
   * @returns A promise that resolves when the CLI is finished
   */
  public async run(args: string[] = process.argv): Promise<void> {
    // Parse arguments
    const { command, options } = this.parseArgs(args);
    
    // Emit CLI started event
    this.eventEmitter.emit('cli:started', {
      command,
      options
    });
    
    // Execute command
    await this.executeCommand(command, options);
    
    // Emit CLI finished event
    this.eventEmitter.emit('cli:finished', {
      command,
      options
    });
  }

  /**
   * Print help information
   * 
   * @param command - Optional command name
   */
  public printHelp(command?: string): void {
    if (command) {
      // Print help for specific command
      const commandDef = this.findCommand(command);
      
      if (!commandDef) {
        console.error(chalk.red(`Unknown command: ${command}`));
        console.log('Run "help" to see available commands');
        return;
      }
      
      console.log(chalk.cyan(`Command: ${command}`));
      console.log(chalk.white(commandDef.description));
      
      if (commandDef.aliases && commandDef.aliases.length > 0) {
        console.log(chalk.cyan('Aliases:'));
        console.log(chalk.white(`  ${commandDef.aliases.join(', ')}`));
      }
      
      if (commandDef.options) {
        console.log(chalk.cyan('Options:'));
        
        Object.entries(commandDef.options).forEach(([name, description]) => {
          let optionText = `  --${name}`;
          
          if (typeof description !== 'string') {
            if (description.default !== undefined) {
              optionText += ` (default: ${description.default})`;
            }
            console.log(chalk.green(optionText));
            console.log(chalk.white(`    ${description.description}`));
          } else {
            console.log(chalk.green(optionText));
            console.log(chalk.white(`    ${description}`));
          }
        });
      }
      
      if (commandDef.subcommands && commandDef.subcommands.length > 0) {
        console.log(chalk.cyan('Subcommands:'));
        
        commandDef.subcommands.forEach((subcommand) => {
          console.log(chalk.green(`  ${subcommand.name}`));
          console.log(chalk.white(`    ${subcommand.description}`));
        });
      }
    } else {
      // Print general help
      const packageInfo = this.config.get('package', {
        name: 'MongoDB vs PostgreSQL Benchmark',
        version: '1.0.0',
        description: 'Benchmark tool for comparing MongoDB and PostgreSQL performance'
      });
      
      console.log(chalk.cyan(`${packageInfo.name} v${packageInfo.version}`));
      console.log(chalk.white(packageInfo.description));
      console.log('');
      console.log(chalk.cyan('Usage:'));
      console.log(chalk.white('  npm start [command] [options]'));
      console.log('');
      console.log(chalk.cyan('Commands:'));
      
      // Get all root-level commands (not subcommands)
      const rootCommands = Array.from(this.commands.entries())
        .filter(([name]) => !name.includes(':'))
        .map(([_, command]) => command);
      
      // Print commands
      rootCommands.forEach((command) => {
        console.log(chalk.green(`  ${command.name}`));
        console.log(chalk.white(`    ${command.description}`));
      });
      
      console.log('');
      console.log(chalk.white('For more information, run "help [command]"'));
    }
  }

  /**
   * Print version information
   */
  public printVersion(): void {
    const packageInfo = this.config.get('package', {
      name: 'MongoDB vs PostgreSQL Benchmark',
      version: '1.0.0'
    });
    
    console.log(chalk.cyan(`${packageInfo.name} v${packageInfo.version}`));
  }
} 