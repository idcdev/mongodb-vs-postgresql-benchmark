# Complex Queries Benchmark

## What This Benchmark Tests

This benchmark compares the performance of MongoDB and PostgreSQL when executing **complex queries**, focusing on:

1. **Aggregations/Joins**: Combining data from multiple collections/tables
2. **Data Transformations**: Reshaping and computing data within queries
3. **Advanced Filtering**: Applying complex conditions across related data structures

## Why This Is Important

Complex query performance is critical for:
- Analytical applications that need to process and present data insights
- Dashboard systems that aggregate metrics from multiple data sources
- Business intelligence tools that rely on complex data relationships
- Applications that need to present denormalized views of normalized data

## Test Methodology

The benchmark:
1. Creates a realistic dataset with related entities (users, posts, comments, etc.)
2. Performs equivalent complex operations in both databases:
   - MongoDB: Using the aggregation pipeline
   - PostgreSQL: Using SQL joins and window functions
3. Measures execution time and resource utilization
4. Evaluates scalability as data complexity and volume increase

## Expected Results

This benchmark helps you understand:
- Which database better handles complex data relationships
- The performance trade-offs between normalized and denormalized data models
- How query optimization works in document vs. relational databases
- The impact of indexing strategies on complex query performance

## Running This Benchmark

Run this benchmark using the CLI tool with:

```
node src/cli.js run complex-queries --size [small|medium|large]
```

You can customize parameters like data size to test different scenarios. 