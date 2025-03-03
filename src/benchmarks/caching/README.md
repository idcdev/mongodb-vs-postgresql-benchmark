# Caching Benchmark

## What This Benchmark Tests

This benchmark evaluates MongoDB and PostgreSQL as potential **caching layers**, measuring:

1. **Single Set/Get Operations**: Performance of storing and retrieving individual cache entries
2. **Bulk Operations**: Efficiency of storing many cache items at once
3. **Hot Keys Access**: Performance when repeatedly accessing frequently used data
4. **TTL Expiration**: Behavior and overhead of time-to-live cache mechanisms

## Why This Is Important

Caching performance is critical because:
- Effective caching significantly reduces load on primary data stores
- Cache hit/miss ratios directly impact application response times
- Many applications rely on caching for real-time performance requirements
- Understanding database capabilities as caching layers helps in architecture decisions

## Test Methodology

The benchmark:
1. Simulates realistic caching scenarios with variable data sizes and access patterns
2. Tests performance under both low and high concurrency conditions
3. Measures throughput and latency for different cache operations
4. Evaluates memory efficiency and management of cached data

## Expected Results

This benchmark helps you understand:
- The viability of using MongoDB or PostgreSQL as a caching layer
- Performance characteristics compared to dedicated caching solutions
- Overhead of TTL and expiration mechanisms in each database
- How each database handles hot/cold data patterns

## Running This Benchmark

Run this benchmark using the CLI tool with:

```
node src/cli.js run caching --size [small|medium|large]
```

You can customize parameters like data size to test different scenarios. 