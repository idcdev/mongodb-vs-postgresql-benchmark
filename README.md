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
npm run benchmark:list
# or
npm run cli list
```

### View Environment Information

```bash
npm run benchmark:info
# or 
npm run cli info
```

### Run Specific Benchmarks

```bash
# Run a specific benchmark
npm run cli run <benchmark-name>

# Examples:
npm run cli run SingleDocumentInsertion
npm run cli run BatchInsertion
npm run cli run SingleDocumentQuery
```

### Run All Benchmarks

```bash
npm run benchmark
# or
npm run cli run all
```

### Data Sizes

You can specify the data size for benchmark execution:

```bash
# Run with specific data sizes
npm run cli run <benchmark-name> --size=small
npm run cli run <benchmark-name> --size=medium
npm run cli run <benchmark-name> --size=large
```

## CLI Options

The command-line interface provides additional options:

```bash
# Basic CLI usage
npm run cli [command] [options]
```

### Available Commands

- `list` - List all available benchmarks
- `run [benchmark]` - Run a specific benchmark or all benchmarks
- `info` - Show environment information

### Run Command Options

When using the `run` command, the following options are available:

```bash
npm run cli run [benchmark] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--size <size>` | Data size (small, medium, large) | small |
| `--iterations <number>` | Number of iterations to run | 5 |
| `--mongodb-uri <uri>` | Custom MongoDB connection URI | from .env |
| `--postgresql-uri <uri>` | Custom PostgreSQL connection URI | from .env |
| `--skip-cleanup` | Skip environment cleanup | false |
| `--output-format <format>` | Output format (console, json) | console |

### Examples

```bash
# Run the SingleDocumentInsertion benchmark with medium data size
npm run cli run SingleDocumentInsertion --size=medium 

# Run all benchmarks with large data size
npm run cli run all --size=large

# Run SingleDocumentQuery benchmark and skip cleanup
npm run cli run SingleDocumentQuery --skip-cleanup
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
| SingleDocumentInsertion | ✅ Complete | Create |
| BatchInsertion | ✅ Complete | Create |
| ValidatedInsertion | ✅ Complete | Create |
| SingleDocumentQuery | ✅ Complete | Read |
| MultipleDocumentQuery | 🔄 Planned | Read |
| FilteredQuery | 🔄 Planned | Read |
| DocumentUpdate | 🔄 Planned | Update |
| BatchUpdate | 🔄 Planned | Update |
| DocumentDeletion | 🔄 Planned | Delete |
| BatchDeletion | 🔄 Planned | Delete |

## Benchmark Types

### Create Operation Benchmarks
- **SingleDocumentInsertion**: Tests the performance of single document insertion
- **BatchInsertion**: Tests bulk insertion with different batch sizes
- **ValidatedInsertion**: Tests performance impact of document/record validation

### Read Operation Benchmarks
- **SingleDocumentQuery**: Tests performance of retrieving documents by ID
- **MultipleDocumentQuery** (Planned): Tests retrieving multiple documents with simple filtering
- **FilteredQuery** (Planned): Tests complex query filtering operations

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