/**
 * Operações MongoDB para o benchmark de inserção
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

// Prefixo para coleções deste benchmark
const COLLECTION_PREFIX = 'insert_';

// URI de conexão MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';

// MongoDB connection singleton (persistent connection for benchmarks)
let cachedClient = null;

/**
 * Configurar ambiente MongoDB para o benchmark
 * @param {Object} options - Opções de configuração
 */
async function setup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Criar coleções para o benchmark
    await db.createCollection(`${COLLECTION_PREFIX}users`);
    
    console.log('MongoDB collections created successfully for insert benchmark');
  } catch (error) {
    console.error('Error setting up MongoDB for insert benchmark:', error);
  }
  // Não fechamos a conexão para reutilizá-la
}

/**
 * Limpar ambiente MongoDB para o benchmark
 * @param {Object} options - Opções de configuração
 */
async function cleanup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Excluir coleções do benchmark
    await db.collection(`${COLLECTION_PREFIX}users`).drop();
    
    console.log('MongoDB collections cleaned successfully for insert benchmark');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('No collections to drop for insert benchmark');
    } else {
      console.error('Error cleaning up MongoDB for insert benchmark:', error);
    }
  } finally {
    // Fechamos a conexão apenas na limpeza final
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
    }
  }
}

/**
 * Inserir um único usuário
 * @param {Object} user - Documento do usuário
 * @returns {Promise<Object>} - Resultado da operação
 */
async function insertUser(user) {
  const client = await getClient();
  const db = client.db();
  
  try {
    const result = await db.collection(`${COLLECTION_PREFIX}users`).insertOne(user);
    return result;
  } catch (error) {
    console.error('Error inserting user in MongoDB:', error);
    throw error;
  }
  // Não fechamos a conexão após cada operação para melhor performance
}

/**
 * Inserir múltiplos usuários
 * @param {Array<Object>} users - Array de documentos de usuários
 * @returns {Promise<Object>} - Resultado da operação
 */
async function insertUsers(users) {
  const client = await getClient();
  const db = client.db();
  
  try {
    const result = await db.collection(`${COLLECTION_PREFIX}users`).insertMany(users);
    return result;
  } catch (error) {
    console.error('Error inserting users in MongoDB:', error);
    throw error;
  }
  // Não fechamos a conexão após cada operação para melhor performance
}

/**
 * Get MongoDB client
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function getClient() {
  // Reutilizar a conexão existente se disponível
  if (cachedClient) {
    return cachedClient;
  }
  
  // Criar uma nova conexão se necessário
  const client = new MongoClient(MONGO_URI, {
    // Configurações de pool de conexões
    maxPoolSize: 10,
    minPoolSize: 5,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000
  });
  
  await client.connect();
  cachedClient = client;
  return client;
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log('MongoDB connection closed for insert benchmark');
  }
}

module.exports = {
  setup,
  cleanup,
  insertUser,
  insertUsers,
  closeConnection
}; 