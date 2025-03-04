/**
 * CLI Handler Interface
 * 
 * This interface defines the contract for the CLI handler,
 * which is responsible for handling command-line interactions.
 */

/**
 * CLI command options
 */
export interface CommandOptions {
  [key: string]: any;
}

/**
 * CLI command definition
 */
export interface CommandDefinition {
  /**
   * Command name
   */
  name: string;
  
  /**
   * Command description
   */
  description: string;
  
  /**
   * Command aliases
   */
  aliases?: string[];
  
  /**
   * Command options
   */
  options?: CommandOptions;
  
  /**
   * Action to execute
   */
  action: (options: CommandOptions) => Promise<void> | void;
  
  /**
   * Subcommands
   */
  subcommands?: CommandDefinition[];
}

/**
 * Core CLI handler interface
 */
export interface CLIHandler {
  /**
   * Register a command
   * 
   * @param command - The command to register
   */
  registerCommand(command: CommandDefinition): void;
  
  /**
   * Get all registered commands
   * 
   * @returns Array of registered commands
   */
  getCommands(): CommandDefinition[];
  
  /**
   * Parse command-line arguments
   * 
   * @param args - Command-line arguments
   * @returns Parsed command and options
   */
  parseArgs(args: string[]): {
    command: string;
    options: CommandOptions;
  };
  
  /**
   * Execute a command
   * 
   * @param command - Command name
   * @param options - Command options
   * @returns A promise that resolves when the command is executed
   */
  executeCommand(command: string, options?: CommandOptions): Promise<void>;
  
  /**
   * Run the CLI
   * 
   * @param args - Command-line arguments (default: process.argv)
   * @returns A promise that resolves when the CLI is finished
   */
  run(args?: string[]): Promise<void>;
  
  /**
   * Print help information
   * 
   * @param command - Optional command name
   */
  printHelp(command?: string): void;
  
  /**
   * Print version information
   */
  printVersion(): void;
} 