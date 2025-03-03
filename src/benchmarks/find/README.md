# Find Benchmark

## What This Benchmark Tests

This benchmark compares the performance of MongoDB and PostgreSQL in **read operations**, specifically focusing on:

1. **Find by ID**: Retrieving documents/records using their primary identifier
2. **Find by Attribute**: Querying documents/records based on specific field values

## Why This Is Important

Read performance is critical for most applications because:
- User-facing applications often read data more frequently than they write
- Slow queries directly impact user experience and perceived application speed
- Read operations often bottleneck before write operations in high-traffic systems
- Understanding index utilization and query optimization is key to database performance

## Test Methodology

The benchmark:
1. Populates both databases with identical datasets
2. Performs repeated lookups using both ID-based and attribute-based queries
3. Measures response time for different query patterns
4. Evaluates how indexing affects query performance

## Expected Results

This benchmark helps you understand:
- Which database performs better for read-heavy workloads
- The performance difference between ID lookups and attribute queries
- How each database's query planner handles different types of lookups
- The impact of data volume on query performance

## Running This Benchmark

Run this benchmark using the CLI tool with:

```
node src/cli.js run find --size [small|medium|large]
```

You can customize parameters like data size to test different scenarios. 