/**
 * Benchmark de Inserção
 * 
 * Este benchmark compara a performance do MongoDB e PostgreSQL
 * em operações de inserção simples e em lote.
 */

const { runBenchmark, compareResults, printResults, saveResults } = require('../../core/utils/benchmark');
const { generateUsers } = require('./data-generator');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Configurar ambiente do benchmark
 * @param {Object} options - Opções de configuração
 */
async function setup(options = {}) {
  console.log('Setting up insert benchmark environment...');
  
  // Inicializar coleções/tabelas
  await mongo.setup(options);
  await postgres.setup(options);
}

/**
 * Limpar ambiente do benchmark
 * @param {Object} options - Opções de configuração
 */
async function cleanup(options = {}) {
  console.log('Cleaning up insert benchmark environment...');
  
  // Limpar coleções/tabelas
  await mongo.cleanup(options);
  await postgres.cleanup(options);
}

/**
 * Executar benchmark de inserção única MongoDB
 * @param {number} count - Número de documentos
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function mongoSingleInsert(count, options = {}) {
  // Gerar usuários para o teste
  const users = generateUsers(count);
  
  // Inserir um por um
  for (const user of users) {
    await mongo.insertUser(user);
  }
  
  return { count, operation: 'single-insert' };
}

/**
 * Executar benchmark de inserção em lote MongoDB
 * @param {number} count - Número de documentos
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function mongoBatchInsert(count, options = {}) {
  // Gerar usuários para o teste
  const users = generateUsers(count);
  
  // Inserir em lote
  await mongo.insertUsers(users);
  
  return { count, operation: 'batch-insert' };
}

/**
 * Executar benchmark de inserção única PostgreSQL
 * @param {number} count - Número de registros
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function pgSingleInsert(count, options = {}) {
  // Gerar usuários para o teste
  const users = generateUsers(count);
  
  // Inserir um por um
  for (const user of users) {
    await postgres.insertUser(user);
  }
  
  return { count, operation: 'single-insert' };
}

/**
 * Executar benchmark de inserção em lote PostgreSQL
 * @param {number} count - Número de registros
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function pgBatchInsert(count, options = {}) {
  // Gerar usuários para o teste
  const users = generateUsers(count);
  
  // Inserir em lote
  await postgres.insertUsers(users);
  
  return { count, operation: 'batch-insert' };
}

/**
 * Executar todos os benchmarks de inserção
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} - Resultados dos benchmarks
 */
async function run(options = {}) {
  console.log('=== Running Insert Benchmarks ===');
  
  // Determinar o tamanho dos dados com base nas opções
  const dataSize = getDataSize(options.size || 'small');
  const iterations = options.iterations || 5;
  
  const results = {
    singleInsert: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    batchInsert: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // Benchmark de inserção única
  console.log(`\nRunning single insert benchmark with ${dataSize} documents...`);
  
  const mongoSingleResults = await runBenchmark(
    mongoSingleInsert, 
    [dataSize, options], 
    iterations
  );
  
  const pgSingleResults = await runBenchmark(
    pgSingleInsert, 
    [dataSize, options], 
    iterations
  );
  
  // Salvar resultados de inserção única
  printResults('Single Insert Benchmark', mongoSingleResults, pgSingleResults);
  results.singleInsert.mongodb = mongoSingleResults;
  results.singleInsert.postgresql = pgSingleResults;
  results.singleInsert.comparison = compareResults(mongoSingleResults, pgSingleResults);
  
  // Benchmark de inserção em lote
  console.log(`\nRunning batch insert benchmark with ${dataSize} documents...`);
  
  const mongoBatchResults = await runBenchmark(
    mongoBatchInsert, 
    [dataSize, options], 
    iterations
  );
  
  const pgBatchResults = await runBenchmark(
    pgBatchInsert, 
    [dataSize, options], 
    iterations
  );
  
  // Salvar resultados de inserção em lote
  printResults('Batch Insert Benchmark', mongoBatchResults, pgBatchResults);
  results.batchInsert.mongodb = mongoBatchResults;
  results.batchInsert.postgresql = pgBatchResults;
  results.batchInsert.comparison = compareResults(mongoBatchResults, pgBatchResults);
  
  // Close database connections
  try {
    console.log('\nClosing database connections...');
    await mongo.closeConnection();
    await postgres.closeConnection();
    console.log('Database connections closed successfully.');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
  
  return results;
}

/**
 * Obter tamanho de dados com base no nome
 * @param {string} size - Nome do tamanho (small, medium, large)
 * @returns {number} - Número de documentos
 */
function getDataSize(size) {
  const sizes = {
    small: 1000,
    medium: 10000,
    large: 100000
  };
  
  return sizes[size] || sizes.small;
}

module.exports = {
  setup,
  cleanup,
  run
}; 