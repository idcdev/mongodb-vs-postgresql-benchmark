# MongoDB vs PostgreSQL Benchmark

This project compares the performance between MongoDB and PostgreSQL across different use cases.

## Project Structure

```
├── src/
│   ├── core/                         # Core shared code
│   │   ├── config/                   # Database configurations
│   │   │   ├── mongo.js              # MongoDB configuration
│   │   │   └── postgres.js           # PostgreSQL configuration
│   │   ├── utils/                    # Utility functions
│   │   │   ├── benchmark.js          # Benchmark measurement tools 
│   │   │   ├── environment.js        # Environment information tools
│   │   │   └── fix-module-loading.js # Module loading troubleshooter
│   │   ├── runner.js                 # Main benchmark runner
│   │   └── run-all.js                # Sequential benchmark executor
│   ├── benchmarks/                   # Individual benchmarks
│   │   ├── insert/                   # Insert operations benchmark
│   │   ├── find/                     # Find operations benchmark
│   │   ├── complex-queries/          # Complex query benchmark
│   │   ├── caching/                  # Caching layer benchmark
│   ├── utils/                        # Utility functions
│   │   ├── clean-db.js               # Database cleanup
│   │   ├── db-health-check.js        # Database health verification
│   │   ├── init-db.js                # Database initialization
│   │   ├── mongo-client.js           # MongoDB client
│   │   └── pg-client.js              # PostgreSQL client
│   └── cli.js                        # Command line interface
├── docker-compose.yml                # Docker configuration
├── package.json                      # Project dependencies
└── README.md                         # This file
```

## Prerequisites

- Node.js 14+
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
```

### View Environment Information

```bash
npm run benchmark:info
```

### Run Specific Benchmarks

```bash
# Run a specific benchmark
npm run benchmark:insert
npm run benchmark:find
npm run benchmark:complex
npm run benchmark:caching

# Or use the generic run command
npm run benchmark:run insert
npm run benchmark:run find
npm run benchmark:run complex-queries
npm run benchmark:run caching
```

### Run All Benchmarks

```bash
npm run benchmark:all
```

### Data Sizes

You can specify the data size for benchmark execution:

```bash
# Run with specific data sizes
npm run benchmark:small
npm run benchmark:medium
npm run benchmark:large
```

## CLI Options

The command-line interface provides additional options not covered by the npm scripts above. You can use these options directly with the CLI:

```bash
# Basic CLI usage
node src/cli.js [command] [options]
```

### Available Commands

- `list` - List all available benchmarks
- `run [benchmark]` - Run a specific benchmark or all benchmarks
- `info` - Show environment information

### Run Command Options

When using the `run` command, the following options are available:

```bash
node src/cli.js run [benchmark] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --size <size>` | Data size (small, medium, large) | small |
| `-i, --iterations <number>` | Number of iterations to run | 5 |
| `--skip-setup` | Skip environment setup | false |
| `--skip-cleanup` | Skip environment cleanup | false |
| `--save` | Save results to file | true |

### Examples

```bash
# Run the insert benchmark with medium data size and 10 iterations
node src/cli.js run insert -s medium -i 10

# Run all benchmarks with large data size
node src/cli.js run -s large

# Run complex-queries benchmark and skip cleanup
node src/cli.js run complex-queries --skip-cleanup
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

| Benchmark | Status | MongoDB Implementation | PostgreSQL Implementation |
|-----------|--------|------------------------|---------------------------|
| Insert    | ✅ Complete | Single/batch insert operations | Single/batch insert operations |
| Find      | ✅ Complete | Find by ID and attribute | Find by ID and attribute |
| Complex Queries | ✅ Complete | Aggregations for user posts and popular posts | JOINs for user posts and popular posts |
| Caching   | ✅ Complete | Key-value caching with TTL | Key-value caching with TTL |
| Analytics | 🔄 Planned | - | - |
| Backup/Restore | 🔄 Planned | - | - |
| Compaction | 🔄 Planned | - | - |
| Concurrency | 🔄 Planned | - | - |
| Content Management | 🔄 Planned | - | - |
| E-commerce | 🔄 Planned | - | - |
| Full-text Search | 🔄 Planned | - | - |
| Geospatial | 🔄 Planned | - | - |
| Indexing | 🔄 Planned | - | - |
| Maintenance | 🔄 Planned | - | - |
| Memory Usage | 🔄 Planned | - | - |
| Replication | 🔄 Planned | - | - |
| Schema Evolution | 🔄 Planned | - | - |
| Sharding | 🔄 Planned | - | - |
| Social Network | 🔄 Planned | - | - |
| Spatial | 🔄 Planned | - | - |
| Time Series | 🔄 Planned | - | - |
| Transactions | 🔄 Planned | - | - |

## Benchmark Types

### Insert Benchmark
Tests the performance of single and batch insert operations.

### Find Benchmark
Tests the performance of finding documents by ID and by attributes.

### Complex Queries Benchmark
Tests the performance of complex queries like aggregations in MongoDB and JOINs in PostgreSQL.

### Caching Benchmark
Tests the performance of using MongoDB and PostgreSQL as caching layers. Includes:

- Single set/get operations
- Bulk set operations
- Hot keys access patterns (simulating real-world cache usage)
- TTL expiration handling

## Benchmark Architecture

Each benchmark in this system is completely isolated from others, providing:

1. **Complete isolation**: Each benchmark manages its own tables/collections with unique prefixes (`insert_users`, `complex_queries_posts`, etc.)
2. **Independent lifecycle**: Each benchmark handles its own setup and cleanup
3. **Clear separation**: Clean boundaries between benchmark types
4. **Easy maintenance**: Add or modify benchmarks without affecting others

## Adding New Benchmarks

To add a new benchmark to the system:

1. Create a new directory: `src/benchmarks/my-benchmark/`
2. Implement the required files:
   - `database/mongo.js`: MongoDB operations
   - `database/postgres.js`: PostgreSQL operations
   - `data-generator.js`: Data generation logic
3. Run `npm run benchmark:fix` to generate the proper `index.js`

After that, your benchmark will be automatically detected and can be run with:
```bash
npm run benchmark:run my-benchmark
```

## Results

Benchmark results are saved in the `results/` directory.

## License

MIT 