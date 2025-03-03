const { getMongoClient } = require('./mongo-client');
const { getPgClient } = require('./pg-client');
const chalk = require('chalk');

/**
 * Clean MongoDB collections
 */
async function cleanMongoDB() {
  console.log(chalk.blue('Cleaning MongoDB collections...'));
  
  const client = await getMongoClient();
  const db = client.db();
  
  try {
    // Get all collection names
    const collections = await db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`  Dropped collection: ${collection.name}`);
    }
    
    console.log(chalk.green('✓ MongoDB collections cleaned successfully'));
    return true;
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log(chalk.yellow('No collections to drop in MongoDB'));
      return true;
    }
    console.error(chalk.red('✗ Error cleaning MongoDB:'), error.message);
    return false;
  } finally {
    await client.close();
  }
}

/**
 * Clean PostgreSQL tables
 */
async function cleanPostgreSQL() {
  console.log(chalk.blue('Cleaning PostgreSQL tables...'));
  
  const client = await getPgClient();
  
  try {
    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT IN ('pg_stat_statements')
    `);
    
    const tables = tablesResult.rows;
    
    // Disable foreign key constraints temporarily
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Truncate each table
    for (const table of tables) {
      try {
        await client.query(`TRUNCATE TABLE "${table.tablename}" CASCADE`);
        console.log(`  Truncated table: ${table.tablename}`);
      } catch (error) {
        console.error(`  Error truncating table ${table.tablename}:`, error.message);
      }
    }
    
    // Re-enable foreign key constraints
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    
    console.log(chalk.green('✓ PostgreSQL tables cleaned successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red('✗ Error cleaning PostgreSQL:'), error.message);
    return false;
  } finally {
    await client.end();
  }
}

/**
 * Clean all databases
 */
async function cleanDatabases() {
  console.log(chalk.bold.blue('=== Cleaning Databases ===\n'));
  
  const mongoSuccess = await cleanMongoDB();
  const postgresSuccess = await cleanPostgreSQL();
  
  if (mongoSuccess && postgresSuccess) {
    console.log(chalk.green.bold('\nAll databases cleaned successfully!'));
    return true;
  } else {
    console.log(chalk.red.bold('\nFailed to clean some databases.'));
    return false;
  }
}

// If this script is run directly
if (require.main === module) {
  cleanDatabases()
    .then(success => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = {
  cleanMongoDB,
  cleanPostgreSQL,
  cleanDatabases
}; 