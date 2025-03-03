const { getMongoClient } = require('./mongo-client');
const { getPgClient } = require('./pg-client');
const chalk = require('chalk');

/**
 * Initialize MongoDB collections
 */
async function initializeMongoDB() {
  const mongoClient = await getMongoClient();
  const db = mongoClient.db();

  console.log(chalk.blue('Initializing MongoDB...'));

  try {
    // Create collections if they don't exist
    await db.createCollection('users');
    await db.createCollection('posts');
    await db.createCollection('comments');
    await db.createCollection('products');
    await db.createCollection('orders');
    await db.createCollection('users_with_index');
    await db.createCollection('users_no_index');
    
    console.log(chalk.green('MongoDB collections created successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red('Error initializing MongoDB:'), error);
    return false;
  } finally {
    await mongoClient.close();
  }
}

/**
 * Initialize PostgreSQL tables
 */
async function initializePostgreSQL() {
  const pgClient = await getPgClient();

  console.log(chalk.blue('Initializing PostgreSQL...'));

  try {
    // Create tables if they don't exist
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        age INTEGER,
        street VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN,
        tags TEXT[],
        metadata JSONB,
        shipping_address TEXT
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(200),
        content TEXT,
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        country VARCHAR(100)
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id),
        user_id INTEGER REFERENCES users(id),
        content TEXT,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200),
        description TEXT,
        price DECIMAL(10, 2),
        category VARCHAR(100),
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(12, 2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER,
        price_per_unit DECIMAL(10, 2)
      )
    `);

    // Create tables for indexing benchmarks
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users_no_index (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        age INTEGER,
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        shipping_address TEXT
      )
    `);
    
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users_with_index (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        age INTEGER,
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        shipping_address TEXT
      )
    `);

    // Create indexes for benchmarking
    try {
      await pgClient.query(`DROP INDEX IF EXISTS idx_users_email`);
      await pgClient.query(`DROP INDEX IF EXISTS idx_users_name`);
      await pgClient.query(`DROP INDEX IF EXISTS idx_users_age`);
      await pgClient.query(`DROP INDEX IF EXISTS idx_users_location`);
      await pgClient.query(`DROP INDEX IF EXISTS idx_users_created_at`);
      
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users_with_index(email)`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_users_name ON users_with_index(name)`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_users_age ON users_with_index(age)`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_users_location ON users_with_index(location)`);
      await pgClient.query(`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users_with_index(created_at)`);
    } catch (indexError) {
      console.warn(chalk.yellow('Warning: Some indexes could not be created:'), indexError.message);
      // Continue despite index creation errors
    }

    console.log(chalk.green('PostgreSQL tables created successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red('Error initializing PostgreSQL:'), error);
    return false;
  } finally {
    await pgClient.end();
  }
}

/**
 * Initialize both databases
 */
async function initializeDatabases() {
  console.log(chalk.blue('=== Initializing Databases ==='));
  
  try {
    const mongoInitialized = await initializeMongoDB();
    const pgInitialized = await initializePostgreSQL();
    
    if (mongoInitialized && pgInitialized) {
      console.log(chalk.green('Both databases initialized successfully'));
      return true;
    } else {
      console.log(chalk.yellow('Some databases failed to initialize'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('Error initializing databases:'), error);
    return false;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  initializeDatabases()
    .then(success => {
      if (success) {
        console.log(chalk.green('Database initialization completed successfully'));
      } else {
        console.log(chalk.yellow('Database initialization completed with some issues'));
      }
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('Database initialization failed:'), error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabases,
  initializeMongoDB,
  initializePostgreSQL
}; 