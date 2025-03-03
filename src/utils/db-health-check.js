const { getMongoClient } = require('./mongo-client');
const { getPgClient } = require('./pg-client');
const chalk = require('chalk');

/**
 * Check if MongoDB is running
 */
async function checkMongoHealth() {
  console.log(chalk.blue('Checking MongoDB health...'));
  
  let client;
  try {
    client = await getMongoClient();
    
    // Execute a simple command to check if server is responsive
    const result = await client.db().admin().ping();
    
    if (result.ok === 1) {
      console.log(chalk.green('✓ MongoDB is running'));
      return true;
    } else {
      console.error(chalk.red('✗ MongoDB health check failed'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('✗ MongoDB health check failed:'), error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Check if PostgreSQL is running
 */
async function checkPostgresHealth() {
  console.log(chalk.blue('Checking PostgreSQL health...'));
  
  let client;
  try {
    client = await getPgClient();
    
    // Execute a simple query to check if server is responsive
    const result = await client.query('SELECT NOW() as now');
    
    if (result && result.rows && result.rows.length > 0) {
      console.log(chalk.green('✓ PostgreSQL is running'));
      return true;
    } else {
      console.error(chalk.red('✗ PostgreSQL health check failed'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('✗ PostgreSQL health check failed:'), error.message);
    return false;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

/**
 * Check the health of all databases
 */
async function checkDatabasesHealth() {
  console.log(chalk.bold.blue('=== Checking Database Health ===\n'));
  
  const mongoHealth = await checkMongoHealth();
  const postgresHealth = await checkPostgresHealth();
  
  const allHealthy = mongoHealth && postgresHealth;
  
  if (allHealthy) {
    console.log(chalk.green.bold('\nAll databases are healthy'));
  } else {
    console.log(chalk.red.bold('\nSome databases are not healthy'));
  }
  
  return allHealthy;
}

// If this script is run directly
if (require.main === module) {
  checkDatabasesHealth()
    .then(healthy => {
      process.exit(healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  checkMongoHealth,
  checkPostgresHealth,
  checkDatabasesHealth
}; 