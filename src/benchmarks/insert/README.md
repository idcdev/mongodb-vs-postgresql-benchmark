# Insert Benchmark

## What This Benchmark Tests

This benchmark compares the performance of MongoDB and PostgreSQL in **insert operations**, focusing on:

1. **Single Inserts**: Adding documents/records one at a time
2. **Batch Inserts**: Adding multiple documents/records in a single operation

## Why This Is Important

Insert performance is crucial for applications that:
- Need to handle high write throughput
- Process large volumes of incoming data
- Record user-generated content or system events in real-time

## Test Methodology

The benchmark:
1. Generates synthetic user data with varying complexity
2. Measures the time taken to insert data individually and in batches
3. Compares the performance across different data sizes
4. Evaluates the performance characteristics of each database system under increasing load

## Expected Results

This benchmark helps you understand:
- Which database performs better for write-heavy workloads
- The impact of batch processing on performance
- How each database scales with increasing data volume
- Potential bottlenecks in your data ingestion pipeline

## Running This Benchmark

Run this benchmark using the CLI tool with:

```
node src/cli.js run insert --size [small|medium|large]
```

You can customize parameters like data size to test different scenarios. 