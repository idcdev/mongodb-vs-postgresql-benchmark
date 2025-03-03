/**
 * Data Generator for Caching Benchmark
 * 
 * Provides functions to generate test data for caching benchmarks.
 */

const crypto = require('crypto');
const { faker } = require('@faker-js/faker');

/**
 * Generate a random cache key
 * @returns {string} Random cache key
 */
function generateCacheKey() {
  return `cache:${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate a simple string value
 * @param {number} size Approximate size of the string in bytes
 * @returns {string} Random string
 */
function generateStringValue(size = 100) {
  return faker.lorem.paragraphs(Math.max(1, Math.ceil(size / 100)));
}

/**
 * Generate a random JSON object with specified complexity
 * @param {number} complexity Level of nesting (1-10)
 * @param {number} size Approximate size of the object in bytes
 * @returns {Object} Random JSON object
 */
function generateJsonValue(complexity = 3, size = 100) {
  // Base case
  if (complexity <= 1) {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
      description: generateStringValue(size / 4),
      createdAt: faker.date.past().toISOString()
    };
  }
  
  // Create a more complex object with nested properties
  const result = {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    description: generateStringValue(size / 10),
    createdAt: faker.date.past().toISOString(),
    metadata: {
      tags: Array.from({ length: 3 }, () => faker.lorem.word()),
      category: faker.commerce.department(),
      priority: faker.number.int({ min: 1, max: 5 }),
      status: faker.helpers.arrayElement(['active', 'pending', 'archived'])
    }
  };
  
  // Add nested objects based on complexity
  if (complexity >= 3) {
    result.address = {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode()
    };
  }
  
  if (complexity >= 4) {
    result.stats = {
      views: faker.number.int({ min: 100, max: 10000 }),
      likes: faker.number.int({ min: 10, max: 1000 }),
      shares: faker.number.int({ min: 0, max: 500 }),
      comments: faker.number.int({ min: 0, max: 200 })
    };
  }
  
  if (complexity >= 5) {
    result.items = Array.from(
      { length: Math.min(10, complexity) }, 
      () => ({
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: faker.commerce.price(),
        description: faker.commerce.productDescription().substring(0, size / 20)
      })
    );
  }
  
  if (complexity >= 7) {
    result.history = Array.from(
      { length: Math.min(5, complexity - 5) },
      () => ({
        timestamp: faker.date.past().toISOString(),
        action: faker.helpers.arrayElement(['created', 'updated', 'viewed', 'shared']),
        user: {
          id: faker.string.uuid(),
          name: faker.person.fullName(),
          role: faker.helpers.arrayElement(['admin', 'editor', 'viewer'])
        },
        changes: Array.from(
          { length: 2 },
          () => ({
            field: faker.helpers.arrayElement(['name', 'description', 'status', 'category']),
            oldValue: faker.lorem.word(),
            newValue: faker.lorem.word()
          })
        )
      })
    );
  }
  
  if (complexity >= 9) {
    result.permissions = {
      roles: Array.from(
        { length: 3 },
        () => ({
          name: faker.helpers.arrayElement(['admin', 'editor', 'viewer', 'guest']),
          capabilities: Array.from(
            { length: 4 },
            () => faker.helpers.arrayElement(['read', 'write', 'delete', 'share', 'export', 'import'])
          ),
          restrictions: {
            timeLimit: faker.helpers.arrayElement([null, 3600, 86400]),
            ipRestrictions: faker.helpers.arrayElement([[], ['192.168.1.1', '10.0.0.1']]),
            maxUsage: faker.number.int({ min: 0, max: 1000 })
          }
        })
      ),
      accessControl: {
        enabled: faker.datatype.boolean(),
        strategy: faker.helpers.arrayElement(['role-based', 'attribute-based', 'discretionary']),
        defaultPolicy: faker.helpers.arrayElement(['allow', 'deny']),
        exceptions: Array.from(
          { length: 2 },
          () => ({
            condition: faker.lorem.sentence(),
            action: faker.helpers.arrayElement(['allow', 'deny', 'require-approval'])
          })
        )
      }
    };
  }
  
  return result;
}

/**
 * Generate a binary value
 * @param {number} size Size of the binary data in bytes
 * @returns {Buffer} Random binary data
 */
function generateBinaryValue(size = 100) {
  return crypto.randomBytes(size);
}

/**
 * Generate a value based on the specified type and size
 * @param {string} type Type of value ('string', 'json', 'binary')
 * @param {number} size Approximate size in bytes
 * @param {number} complexity Complexity level for JSON objects
 * @returns {any} Generated value
 */
function generateValue(type = 'json', size = 100, complexity = 3) {
  switch (type) {
    case 'string':
      return generateStringValue(size);
    case 'json':
      return generateJsonValue(complexity, size);
    case 'binary':
      return generateBinaryValue(size);
    default:
      return generateJsonValue(complexity, size);
  }
}

/**
 * Generate multiple cache entries
 * @param {Object} options Generation options
 * @param {number} options.count Number of entries to generate
 * @param {string} options.valueType Type of values ('string', 'json', 'binary')
 * @param {number} options.valueSize Approximate size of values in bytes
 * @param {number} options.complexity Complexity level for JSON objects
 * @returns {Array<{key: string, value: any}>} Array of key-value pairs
 */
function generateCacheEntries(options = {}) {
  const {
    count = 100,
    valueType = 'json',
    valueSize = 100,
    complexity = 3
  } = options;
  
  return Array.from({ length: count }, () => ({
    key: generateCacheKey(),
    value: generateValue(valueType, valueSize, complexity)
  }));
}

/**
 * Generate an access pattern for cache keys
 * @param {Array<string>} keys Array of cache keys
 * @param {Object} options Options for access pattern generation
 * @param {number} options.operations Number of operations to simulate
 * @param {number} options.hotKeysPercentage Percentage of keys that are "hot" (0-100)
 * @param {number} options.hotKeyAccessPercentage Percentage of accesses that go to hot keys (0-100)
 * @returns {Array<string>} Array of keys representing the access pattern
 */
function generateAccessPattern(keys, options = {}) {
  const {
    operations = 1000,
    hotKeysPercentage = 20,
    hotKeyAccessPercentage = 80
  } = options;
  
  if (!keys || keys.length === 0) {
    return [];
  }
  
  // Determine hot keys
  const hotKeyCount = Math.max(1, Math.floor(keys.length * (hotKeysPercentage / 100)));
  const hotKeys = [];
  
  // Select random hot keys
  const keysCopy = [...keys];
  for (let i = 0; i < hotKeyCount; i++) {
    const randomIndex = Math.floor(Math.random() * keysCopy.length);
    hotKeys.push(keysCopy[randomIndex]);
    keysCopy.splice(randomIndex, 1);
  }
  
  const coldKeys = keysCopy;
  
  // Generate access pattern
  const accessPattern = [];
  
  for (let i = 0; i < operations; i++) {
    // Determine if this access should be to a hot key
    const useHotKey = Math.random() * 100 < hotKeyAccessPercentage;
    
    if (useHotKey && hotKeys.length > 0) {
      // Select a random hot key
      const randomIndex = Math.floor(Math.random() * hotKeys.length);
      accessPattern.push(hotKeys[randomIndex]);
    } else if (coldKeys.length > 0) {
      // Select a random cold key
      const randomIndex = Math.floor(Math.random() * coldKeys.length);
      accessPattern.push(coldKeys[randomIndex]);
    } else {
      // If no cold keys, use a hot key
      const randomIndex = Math.floor(Math.random() * hotKeys.length);
      accessPattern.push(hotKeys[randomIndex]);
    }
  }
  
  return accessPattern;
}

module.exports = {
  generateCacheKey,
  generateStringValue,
  generateJsonValue,
  generateBinaryValue,
  generateValue,
  generateCacheEntries,
  generateAccessPattern
}; 