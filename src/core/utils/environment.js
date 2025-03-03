/**
 * Utilitário para obter informações do ambiente de execução
 */

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

/**
 * Obtém informações do ambiente de execução
 * @returns {Promise<Object>} Informações do ambiente
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

  // Obter informações dos bancos de dados
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
 * Obtém a versão do MongoDB
 * @returns {Promise<Object>} Informações do MongoDB
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
 * Obtém a versão do PostgreSQL
 * @returns {Promise<Object>} Informações do PostgreSQL
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
 * Imprime informações do ambiente
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