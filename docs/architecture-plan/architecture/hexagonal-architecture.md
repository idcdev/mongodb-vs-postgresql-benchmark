# Hexagonal Architecture Design

## Overview

The MongoDB vs PostgreSQL Benchmark project is being redesigned to follow a hexagonal architecture (also known as ports and adapters). This architectural style allows for better separation of concerns, improved testability, and greater flexibility when extending the system.

## Core Principles

1. **Separation of Domain from Technical Concerns**
   - The core business logic is isolated from external concerns
   - The domain doesn't depend on UI, databases, or external services

2. **Dependency Inversion**
   - High-level modules don't depend on low-level modules
   - Both depend on abstractions

3. **Ports and Adapters**
   - **Ports**: Interfaces that define how the application interacts with the outside world
   - **Adapters**: Implementations of these interfaces for specific technologies

## Architectural Layers

### 1. Domain Layer (Core)

The innermost layer contains the business logic and entities that represent the core concepts of the benchmark system:

- **Entities**: Benchmark, DatabaseAdapter, Result, Configuration
- **Value Objects**: Metrics, Duration, DatabaseType
- **Domain Services**: Execution services, result calculation

This layer has no dependencies on external frameworks or libraries. It defines interfaces (ports) that the outer layers must implement.

### 2. Application Layer

This layer orchestrates the use cases of the application:

- Coordinates the execution of benchmarks
- Manages benchmark lifecycle
- Handles configuration loading
- Processes and stores results

The application layer depends on the domain layer but not on infrastructure concerns.

### 3. Infrastructure Layer

Implements the technical details required by the application:

- Database adapters (MongoDB, PostgreSQL)
- File system access
- Configuration loading
- Plugin management

### 4. Ports Layer

Contains the interfaces (APIs) for interacting with the application:

- Command Line Interface
- HTTP API (future)
- Report generators
- Event listeners

## Component Interactions

```
                    ┌───────────────────────────────────────────┐
                    │               External World              │
                    └───────────────────────────────────────────┘
                                       │
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                  Adapters                                          │
│  ┌─────────────┐    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  CLI        │    │  MongoDB    │     │ PostgreSQL  │     │ Config File │       │
│  │  Adapter    │    │  Adapter    │     │ Adapter     │     │ Adapter     │       │
│  └─────────────┘    └─────────────┘     └─────────────┘     └─────────────┘       │
└───────────────────────────────────────────────────────────────────────────────────┘
                  │            │               │                  │
                  │            │               │                  │
                  ▼            ▼               ▼                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                    Ports                                           │
│  ┌─────────────┐    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ UI          │    │ Database    │     │ Database    │     │ Config      │       │
│  │ Port        │    │ Port        │     │ Port        │     │ Port        │       │
│  └─────────────┘    └─────────────┘     └─────────────┘     └─────────────┘       │
└───────────────────────────────────────────────────────────────────────────────────┘
                  │            │               │                  │
                  │            │               │                  │
                  ▼            ▼               ▼                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                               Application Layer                                    │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Application Services                               │  │
│  │                                                                              │  │
│  │  - BenchmarkService                                                          │  │
│  │  - ConfigurationService                                                      │  │
│  │  - ResultsService                                                            │  │
│  │                                                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                            │
└───────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                Domain Layer                                        │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                           Domain Model                                       │  │
│  │                                                                              │  │
│  │  - Benchmark                                                                 │  │
│  │  - BenchmarkResult                                                           │  │
│  │  - DatabaseType                                                              │  │
│  │  - Metrics                                                                   │  │
│  │                                                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Key Benefits for the Benchmark System

1. **Testability**: The domain and application logic can be tested independently of database implementations
2. **Flexibility**: New database adapters can be added without changing the core logic
3. **Maintainability**: Clear separation of concerns makes the codebase easier to understand and modify
4. **Extensibility**: New features and benchmarks can be added as plugins without modifying existing code

## Implementation Strategy

1. Define the core domain model and interfaces
2. Implement application services
3. Create infrastructure adapters
4. Develop port implementations
5. Gradually migrate existing benchmarks to the new architecture

## Technology Choices

- **Language**: TypeScript for type safety
- **Testing**: Jest for unit and integration tests
- **Configuration**: Config library with schema validation
- **Events**: EventEmitter2 for application events

## Next Steps

1. Define domain entities and interfaces
2. Create database adapter interfaces
3. Implement core application services 