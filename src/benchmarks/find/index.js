/**
 * Benchmark de Busca
 * 
 * Este benchmark compara a performance do MongoDB e PostgreSQL
 * em operações de busca.
 */

const { runBenchmark, compareResults, printResults } = require('../../core/utils/benchmark');
const { generateUsers } = require('./data-generator');
const mongo = require('./database/mongo');
const postgres = require('./database/postgres');

/**
 * Configurar ambiente do benchmark
 * @param {Object} options - Opções de configuração
 */
async function setup(options = {}) {
  console.log('Setting up find benchmark environment...');
  
  // Inicializar coleções/tabelas e inserir dados
  await mongo.setup(options);
  await postgres.setup(options);
}

/**
 * Limpar ambiente do benchmark
 * @param {Object} options - Opções de configuração
 */
async function cleanup(options = {}) {
  console.log('Cleaning up find benchmark environment...');
  
  // Limpar coleções/tabelas
  await mongo.cleanup(options);
  await postgres.cleanup(options);
}

/**
 * Executar benchmark de busca por ID no MongoDB
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function mongoFindById(options = {}) {
  // Obter um ID aleatório ANTES de iniciar a medição do benchmark
  // Isso garante que apenas a operação de busca real seja medida
  const randomId = options.randomUserId || await mongo.getRandomUserId();
  
  // Buscar por ID (apenas esta operação será cronometrada)
  const results = await mongo.findById(randomId);
  return { operation: 'find-by-id', results };
}

/**
 * Executar benchmark de busca por atributo no MongoDB
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function mongoFindByAttribute(options = {}) {
  // Obter um país aleatório ANTES de iniciar a medição do benchmark
  // Isso garante que apenas a operação de busca real seja medida
  const randomCountry = options.randomCountry || await mongo.getRandomCountry();
  
  // Buscar por atributo (apenas esta operação será cronometrada)
  const results = await mongo.findByAttribute(randomCountry);
  return { operation: 'find-by-attribute', results };
}

/**
 * Executar benchmark de busca por ID no PostgreSQL
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function pgFindById(options = {}) {
  // Obter um ID aleatório ANTES de iniciar a medição do benchmark
  // Isso garante que apenas a operação de busca real seja medida
  const randomId = options.randomUserId || await postgres.getRandomUserId();
  
  // Buscar por ID (apenas esta operação será cronometrada)
  const results = await postgres.findById(randomId);
  return { operation: 'find-by-id', results };
}

/**
 * Executar benchmark de busca por atributo no PostgreSQL
 * @param {Object} options - Opções adicionais
 * @returns {Promise<Object>} - Resultados do benchmark
 */
async function pgFindByAttribute(options = {}) {
  // Obter um país aleatório ANTES de iniciar a medição do benchmark
  // Isso garante que apenas a operação de busca real seja medida
  const randomCountry = options.randomCountry || await postgres.getRandomCountry();
  
  // Buscar por atributo (apenas esta operação será cronometrada)
  const results = await postgres.findByAttribute(randomCountry);
  return { operation: 'find-by-attribute', results };
}

/**
 * Executar todos os benchmarks de busca
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} - Resultados dos benchmarks
 */
async function run(options = {}) {
  console.log('=== Running Find Benchmarks ===');
  
  // Número de iterações
  const iterations = options.iterations || 5;
  
  const results = {
    findById: {
      mongodb: null,
      postgresql: null,
      comparison: null
    },
    findByAttribute: {
      mongodb: null,
      postgresql: null,
      comparison: null
    }
  };
  
  // Benchmark de busca por ID
  console.log('\nRunning find by ID benchmark...');
  
  // Preparar ID aleatório para MongoDB - isso mantém o mesmo ID para todas as iterações
  const randomMongoUserId = await mongo.getRandomUserId();
  
  // Preparar ID aleatório para PostgreSQL - isso mantém o mesmo ID para todas as iterações
  const randomPgUserId = await postgres.getRandomUserId();
  
  const mongoFindByIdResults = await runBenchmark(
    mongoFindById, 
    [{ ...options, randomUserId: randomMongoUserId }], 
    iterations
  );
  
  const pgFindByIdResults = await runBenchmark(
    pgFindById, 
    [{ ...options, randomUserId: randomPgUserId }], 
    iterations
  );
  
  // Salvar resultados de busca por ID
  printResults('Find by ID Benchmark', mongoFindByIdResults, pgFindByIdResults);
  results.findById.mongodb = mongoFindByIdResults;
  results.findById.postgresql = pgFindByIdResults;
  results.findById.comparison = compareResults(mongoFindByIdResults, pgFindByIdResults);
  
  // Benchmark de busca por atributo
  console.log('\nRunning find by attribute benchmark...');
  
  // Preparar país aleatório para MongoDB - isso mantém o mesmo país para todas as iterações
  const randomMongoCountry = await mongo.getRandomCountry();
  
  // Preparar país aleatório para PostgreSQL - isso mantém o mesmo país para todas as iterações
  const randomPgCountry = await postgres.getRandomCountry();
  
  const mongoFindByAttributeResults = await runBenchmark(
    mongoFindByAttribute, 
    [{ ...options, randomCountry: randomMongoCountry }], 
    iterations
  );
  
  const pgFindByAttributeResults = await runBenchmark(
    pgFindByAttribute, 
    [{ ...options, randomCountry: randomPgCountry }], 
    iterations
  );
  
  // Salvar resultados de busca por atributo
  printResults('Find by Attribute Benchmark', mongoFindByAttributeResults, pgFindByAttributeResults);
  results.findByAttribute.mongodb = mongoFindByAttributeResults;
  results.findByAttribute.postgresql = pgFindByAttributeResults;
  results.findByAttribute.comparison = compareResults(mongoFindByAttributeResults, pgFindByAttributeResults);
  
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

module.exports = {
  setup,
  cleanup,
  run
}; 