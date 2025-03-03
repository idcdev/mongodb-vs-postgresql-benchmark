/**
 * Operações PostgreSQL para o benchmark de inserção
 */

const { Pool } = require('pg');
const pgp = require('pg-promise')();
require('dotenv').config();

// Prefixo para tabelas deste benchmark
const TABLE_PREFIX = 'insert_';

// URI de conexão PostgreSQL
const PG_URI = process.env.PG_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark';

// Conexão com PostgreSQL - já está usando pool de conexões
const pool = new Pool({ 
  connectionString: PG_URI,
  max: 10, // máximo de conexões no pool
  idleTimeoutMillis: 30000 // tempo máximo que uma conexão pode ficar inativa
});

// Flag to track if the pool has been closed
let poolClosed = false;

// pg-promise já gerencia conexões eficientemente
const db = pgp(PG_URI);

/**
 * Configurar ambiente PostgreSQL para o benchmark
 * @param {Object} options - Opções de configuração
 */
async function setup(options = {}) {
  const client = await pool.connect();
  
  try {
    // Criar tabelas para o benchmark
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}users (
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
        metadata JSONB
      )
    `);
    
    console.log('PostgreSQL tables created successfully for insert benchmark');
  } catch (error) {
    console.error('Error setting up PostgreSQL for insert benchmark:', error);
  } finally {
    // Devolvemos a conexão ao pool, não fechamos
    await client.release();
  }
}

/**
 * Limpar ambiente PostgreSQL para o benchmark
 * @param {Object} options - Opções de configuração
 */
async function cleanup(options = {}) {
  // Skip if pool is already closed
  if (poolClosed) {
    console.log('PostgreSQL pool already closed, skipping cleanup');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Excluir tabelas do benchmark
    await client.query(`DROP TABLE IF EXISTS ${TABLE_PREFIX}users CASCADE`);
    
    console.log('PostgreSQL tables cleaned successfully for insert benchmark');
  } catch (error) {
    console.error('Error cleaning up PostgreSQL for insert benchmark:', error);
  } finally {
    // Devolvemos a conexão ao pool
    await client.release();
  }
}

/**
 * Inserir um único usuário
 * @param {Object} user - Dados do usuário
 * @returns {Promise<Object>} - Resultado da operação
 */
async function insertUser(user) {
  try {
    const query = `
      INSERT INTO ${TABLE_PREFIX}users (
        first_name, last_name, email, age, 
        street, city, state, zip_code, country,
        is_active, tags, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING id
    `;
    
    const values = [
      user.firstName,
      user.lastName,
      user.email,
      user.age,
      user.address.street,
      user.address.city,
      user.address.state,
      user.address.zipCode,
      user.address.country,
      user.isActive,
      user.tags,
      user.metadata
    ];
    
    // db.one já gerencia conexões eficientemente
    const result = await db.one(query, values);
    return result;
  } catch (error) {
    console.error('Error inserting user in PostgreSQL:', error);
    throw error;
  }
}

/**
 * Inserir múltiplos usuários
 * @param {Array<Object>} users - Array de dados de usuários
 * @returns {Promise<Object>} - Resultado da operação
 */
async function insertUsers(users) {
  try {
    // Usar pg-promise para inserção em lote
    const cs = new pgp.helpers.ColumnSet([
      'first_name', 'last_name', 'email', 'age',
      'street', 'city', 'state', 'zip_code', 'country',
      'is_active', 'tags', 'metadata'
    ], { table: `${TABLE_PREFIX}users` });
    
    // Transformar dados
    const values = users.map(user => ({
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      age: user.age,
      street: user.address.street,
      city: user.address.city,
      state: user.address.state,
      zip_code: user.address.zipCode,
      country: user.address.country,
      is_active: user.isActive,
      tags: user.tags,
      metadata: user.metadata
    }));
    
    // Criar query de inserção em lote
    const query = pgp.helpers.insert(values, cs);
    
    // Executar query - db.many já gerencia conexões eficientemente
    const result = await db.many(`${query} RETURNING id`);
    return result;
  } catch (error) {
    console.error('Error inserting users in PostgreSQL:', error);
    throw error;
  }
}

/**
 * Close PostgreSQL connection pool
 * @returns {Promise<void>}
 */
async function closeConnection() {
  try {
    if (!poolClosed) {
      await pool.end();
      poolClosed = true;
      console.log('PostgreSQL connection pool closed for insert benchmark');
    } else {
      console.log('PostgreSQL pool already closed');
    }
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool:', error);
  }
}

module.exports = {
  setup,
  cleanup,
  insertUser,
  insertUsers,
  closeConnection
}; 