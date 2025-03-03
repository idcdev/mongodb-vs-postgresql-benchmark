/**
 * Utility for getting runtime environment information
 */

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Gets runtime environment information
 * @returns {Promise<Object>} Environment information
 */
async function getEnvironmentInfo() {
  const env = {
    platform: {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpus: os.cpus().map(cpu => ({
        model: cpu.model,
        speed: cpu.speed
      })),
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB'
    },
    node: {
      version: process.version,
      env: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  };

  // Get database information
  try {
    // MongoDB
    env.databases = {
      mongodb: await getMongoDBVersion(),
      postgresql: await getPostgreSQLVersion()
    };
  } catch (error) {
    env.databases = {
      error: `Could not get database versions: ${error.message}`
    };
  }

  return env;
}

/**
 * Gets MongoDB version
 * @returns {Promise<Object>} MongoDB information
 */
async function getMongoDBVersion() {
  try {
    const { stdout } = await execPromise('docker exec mongodb-benchmark mongo --eval "db.version()" --quiet || echo "Not available"');
    return {
      version: stdout.trim()
    };
  } catch (error) {
    return { 
      version: 'Not available',
      error: error.message
    };
  }
}

/**
 * Gets PostgreSQL version
 * @returns {Promise<Object>} PostgreSQL information
 */
async function getPostgreSQLVersion() {
  try {
    const { stdout } = await execPromise('docker exec postgres-benchmark psql -U postgres -c "SELECT version();" || echo "Not available"');
    return {
      version: stdout.trim()
    };
  } catch (error) {
    return { 
      version: 'Not available',
      error: error.message
    };
  }
}

/**
 * Prints environment information
 */
async function printEnvironmentInfo() {
  const env = await getEnvironmentInfo();
  
  console.log(`Node.js: ${env.node.version}`);
  console.log(`Platform: ${env.platform.type} (${env.platform.platform} ${env.platform.release})`);
  console.log(`CPU: ${env.platform.cpus[0].model} (${env.platform.cpus.length} cores)`);
  console.log(`Memory: ${env.platform.totalMemory} (${env.platform.freeMemory} free)`);
  console.log(`MongoDB: ${env.databases.mongodb.version || 'Not available'}`);
  console.log(`PostgreSQL: ${env.databases.postgresql.version || 'Not available'}`);
}

module.exports = {
  getEnvironmentInfo,
  printEnvironmentInfo
}; 