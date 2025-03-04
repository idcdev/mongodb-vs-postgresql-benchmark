/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: {
        ignoreCodes: [1343]
      }
    }]
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  coverageThreshold: {
    './src/core/application/config/': {
      branches: 50,
      functions: 70,
      lines: 70,
      statements: 70
    },
    './src/core/application/events/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
}; 