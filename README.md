# MongoDB vs PostgreSQL Benchmark

This project compares the performance between MongoDB and PostgreSQL across different use cases.

## Project Structure

```
├── src/
│   ├── core/                          # Core domain code
│   │   ├── benchmarks/                # Standard benchmarks implementations
│   │   │   ├── operations/            # CRUD operations benchmarks
│   │   │   │   ├── create/            # Create operations benchmarks
│   │   │   │   ├── read/              # Read operations benchmarks
│   │   │   │   ├── update/            # Update operations benchmarks
│   │   │   │   └── delete/            # Delete operations benchmarks
│   │   │   └── standard/              # Standard benchmark implementations
│   │   ├── config/                    # Configuration providers
│   │   ├── domain/                    # Domain models and interfaces
│   │   │   ├── interfaces/            # Core interfaces
│   │   │   └── model/                 # Domain entities and value objects
│   │   ├── infrastructure/            # Infrastructure implementations
│   │   │   ├── adapters/              # Database adapters
│   │   │   └── config/                # Infrastructure configurations
│   │   └── services/                  # Domain services
│   ├── utils/                         # Utility functions
│   │   ├── clean-db.js                # Database cleanup
│   │   ├── db-health-check.js         # Database health verification
│   │   ├── init-db.js                 # Database initialization
│   │   ├── mongo-client.js            # MongoDB client
│   │   └── pg-client.js               # PostgreSQL client
│   ├── cli.ts                         # Command line interface
│   └── run-benchmarks.ts              # Main benchmark runner
├── docs/                              # Documentation
│   └── architecture-plan/             # Architecture documentation
├── docker-compose.yml                 # Docker configuration
├── package.json                       # Project dependencies
└── README.md                          # This file
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the databases:

```bash
npm run start:db
```

## Running Benchmarks

### List Available Benchmarks

```bash
npm run cli list
```

This command displays all available benchmarks with their descriptions and supported databases.

### View Environment Information

```bash
npm run cli info
```

This command shows system information, database connection status, and available benchmarks.

### Run Specific Benchmarks

```bash
# Run a specific benchmark
npm run cli run <benchmark-name>

# Examples:
npm run cli run single-document-insertion
npm run cli run batch-insertion
npm run cli run single-document-query

# Run multiple benchmarks
npm run cli run single-document-insertion batch-insertion
```

### Run All Benchmarks

```bash
npm run cli run all
```

### Output Formats

You can specify the output format for benchmark results:

```bash
# Run with simple output format (default)
npm run cli run <benchmark-name> -f simple

# Run with detailed output format
npm run cli run <benchmark-name> -f detailed
# or
npm run cli run <benchmark-name> detailed
```

### Data Sizes

You can specify the data size for benchmark execution:

```bash
# Run with specific data sizes
npm run cli run <benchmark-name> -s small
npm run cli run <benchmark-name> -s medium
npm run cli run <benchmark-name> -s large
```

## CLI Options

The command-line interface provides additional options:

```bash
# Basic CLI usage
npm run cli [command] [options]
```

### Available Commands

- `list` - List all available benchmarks with descriptions and supported databases
- `info` - Show environment information (system, databases, available benchmarks)
- `run [benchmarks...]` - Run one or more benchmarks with various options

### Run Command Options

When using the `run` command, the following options are available:

```bash
npm run cli run [benchmarks...] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mongo-uri <uri>` | MongoDB connection URI | mongodb://localhost:27017/benchmark |
| `-p, --postgres-uri <uri>` | PostgreSQL connection URI | postgresql://postgres:postgres@localhost:5432/benchmark |
| `-s, --size <size>` | Data size (small, medium, large) | small |
| `-i, --iterations <number>` | Number of iterations to run | 3 |
| `-o, --output <dir>` | Output directory for results | ./benchmark-results |
| `--no-cleanup` | Do not clean up after benchmarks | false |
| `-f, --format <format>` | Output format (simple, detailed) | simple |

### Output Formats

The CLI supports two output formats:

1. **simple** - Shows a basic summary with median and mean durations for each database
2. **detailed** - Shows comprehensive statistics including min, max, mean, median, standard deviation, iteration details, and comparison metrics

### Examples

```bash
# Run a specific benchmark with default options
npm run cli run single-document-insertion

# Run a benchmark with detailed output format
npm run cli run single-document-insertion -f detailed
# or
npm run cli run single-document-insertion detailed

# Run a benchmark with custom MongoDB URI and 5 iterations
npm run cli run batch-insertion -m mongodb://localhost:27017/custom_db -i 5

# Run multiple benchmarks with medium data size
npm run cli run single-document-insertion batch-insertion -s medium

# Run all benchmarks
npm run cli run all
```

## CLI Usage

You can use the CLI in two ways:

### Using npm script

```bash
npm run cli [command] [options]
```

### Using npx directly

```bash
npx ts-node src/cli.ts [command] [options]
```

For help on available commands and options:

```bash
# General help
npm run cli --help
# or
npx ts-node src/cli.ts --help

# Command-specific help
npm run cli run --help
# or
npx ts-node src/cli.ts run --help
```

## Database Management

The project includes several commands for managing the database environment:

```bash
# Start the databases
npm run start:db

# Stop the databases
npm run stop:db

# Clean database volumes
npm run clean:db

# Check database health
npm run check:db
npm run health:db

# Initialize databases
npm run init:db

# Reset databases (clean and init)
npm run reset:db
```

## Implemented Benchmarks

| Benchmark | Status | Operation Type |
|-----------|--------|----------------|
| single-document-insertion | ✅ Complete | Create |
| batch-insertion | ✅ Complete | Create |
| validated-insertion | ✅ Complete | Create |
| single-document-query | ✅ Complete | Read |
| multiple-document-query | 🔄 Planned | Read |
| filtered-query | 🔄 Planned | Read |
| document-update | 🔄 Planned | Update |
| batch-update | 🔄 Planned | Update |
| document-deletion | 🔄 Planned | Delete |
| batch-deletion | 🔄 Planned | Delete |

## Benchmark Types

### Create Operation Benchmarks
- **single-document-insertion**: Tests the performance of single document insertion
- **batch-insertion**: Tests bulk insertion with different batch sizes
- **validated-insertion**: Tests performance impact of document/record validation

### Read Operation Benchmarks
- **single-document-query**: Tests performance of retrieving documents by ID
- **multiple-document-query** (Planned): Tests retrieving multiple documents with simple filtering
- **filtered-query** (Planned): Tests complex query filtering operations

## Architecture

The project follows a hexagonal architecture pattern. For detailed architecture documentation, see the [Architecture Plan](./docs/architecture-plan/README.md).

## Implementation Status

| Phase | Description | Status | Progress |
|-------|-------------|--------|----------|
| 1 | Foundation Architectural Redesign | Complete | 100% |
| 2 | Standard Benchmarks | In Progress | 40% |
| 3 | Custom Benchmarks and Analysis | Not Started | 0% |

## Results

Benchmark results are saved in the `results/` directory.

## License

MIT 