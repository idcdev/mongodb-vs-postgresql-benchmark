#!/usr/bin/env node

/**
 * Command-line interface for the benchmark system
 */

const { program } = require('commander');
const chalk = require('chalk');
const { runBenchmark, runAllBenchmarks, listBenchmarks } = require('./core/runner');
const { printEnvironmentInfo } = require('./core/utils/environment');
require('dotenv').config();

program
  .name('benchmark')
  .description('MongoDB vs PostgreSQL Benchmark CLI')
  .version('1.0.0');

program
  .command('list')
  .description('List available benchmarks')
  .action(async () => {
    console.log(chalk.blue('Available benchmarks:'));
    const benchmarks = await listBenchmarks();
    
    if (benchmarks.length === 0) {
      console.log(chalk.yellow('No benchmarks found'));
    } else {
      benchmarks.forEach(benchmark => {
        console.log(`- ${benchmark}`);
      });
    }
  });

program
  .command('run [benchmark]')
  .description('Run a specific benchmark or all benchmarks')
  .option('-s, --size <size>', 'Data size (small, medium, large)', 'small')
  .option('-i, --iterations <number>', 'Number of iterations', process.env.ITERATIONS || '5')
  .option('--skip-setup', 'Skip environment setup', false)
  .option('--skip-cleanup', 'Skip environment cleanup', false)
  .option('--save', 'Save results to file', true)
  .action(async (benchmark, options) => {
    try {
      // Show environment information
      console.log(chalk.blue('Environment information:'));
      await printEnvironmentInfo();
      
      // Convert options
      const benchmarkOptions = {
        size: options.size,
        iterations: parseInt(options.iterations),
        setupEnvironment: !options.skipSetup,
        cleanupEnvironment: !options.skipCleanup,
        saveResults: options.save === undefined ? true : options.save
      };
      
      console.log(chalk.dim(`Options: ${JSON.stringify(benchmarkOptions, null, 2)}`));
      
      if (!benchmark) {
        // Run all benchmarks
        await runAllBenchmarks(benchmarkOptions);
      } else {
        // Run a specific benchmark
        await runBenchmark(benchmark, benchmarkOptions);
      }
      
      console.log(chalk.green('\nBenchmark(s) completed successfully'));
      
      // Force process exit after benchmark completion
      // Increase wait time to 2 seconds to allow connections to close
      console.log(chalk.dim('Waiting for connections to close before exiting...'));
      setTimeout(() => {
        process.exit(0);
      }, 2000);
    } catch (error) {
      console.error(chalk.red('Error running benchmark:'), error);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show environment information')
  .action(async () => {
    console.log(chalk.blue('Environment information:'));
    await printEnvironmentInfo();
  });

// Se nenhum comando for fornecido, mostrar ajuda
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv); 