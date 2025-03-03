# Benchmark Results

This directory contains the results of the MongoDB vs PostgreSQL benchmark tests.

## Result Files

- `insert_*.json`: Results of single and batch insert operations
- `find_*.json`: Results of simple find/select operations
- `complex-queries_*.json`: Results of complex queries (joins/aggregates)
- `caching_*.json`: Results of caching layer performance

## Result Format

Each result file contains detailed information about the benchmark, including:

- Execution environment (Node.js version, OS, CPU, memory)
- Benchmark configuration (iterations, data size)
- Execution times (mean, median, min, max, standard deviation)
- Comparison between MongoDB and PostgreSQL
- Performance difference percentages

## Visualizing Results

You can visualize these results by creating charts using the data in these JSON files.

Example:

```javascript
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Load result data
const insertResults = require('./insert_*.json');
const findResults = require('./find_*.json');
const complexQueryResults = require('./complex-queries_*.json');
const cachingResults = require('./caching_*.json');

// Create charts...
```

## Interpreting Results

When interpreting these results, consider the following factors:

1. **Hardware**: The performance of both databases can vary significantly based on hardware.
2. **Data Size**: Different data sizes can affect performance differently.
3. **Query Complexity**: Simple vs complex queries may favor different databases.
4. **Indexing**: The impact of indexes on performance.
5. **Configuration**: Default configurations were used for both databases.
6. **Use Case**: Different databases excel at different types of operations.

Remember that these benchmarks represent specific use cases and may not reflect the performance of your specific application. Always test with your own data and access patterns for the most accurate results. 