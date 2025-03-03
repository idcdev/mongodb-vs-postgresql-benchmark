/**
 * PostgreSQL operations for complex queries benchmark
 */

const { Pool } = require('pg');
const pgp = require('pg-promise')();
const dataGenerator = require('../data-generator');
require('dotenv').config();

// Prefix for tables in this benchmark
const TABLE_PREFIX = 'complex_queries_';

// PostgreSQL connection URI
const PG_URI = process.env.PG_URI || 'postgresql://postgres:postgres@localhost:5432/benchmark';

// PostgreSQL connection pool configuration
const pool = new Pool({ 
  connectionString: PG_URI,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000 // Close idle clients after 30 seconds
});

// Flag to track if the pool has been closed
let poolClosed = false;

// pg-promise efficiently manages connections via its own pool
const db = pgp(PG_URI);

/**
 * Set up PostgreSQL environment for the benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  const client = await pool.connect();
  
  try {
    // Create tables for the benchmark
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
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${TABLE_PREFIX}users(id),
        title VARCHAR(255),
        content TEXT,
        tags TEXT[],
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_published BOOLEAN
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES ${TABLE_PREFIX}posts(id),
        user_id INTEGER REFERENCES ${TABLE_PREFIX}users(id),
        content TEXT,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_approved BOOLEAN
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS ${TABLE_PREFIX}posts_user_id_idx ON ${TABLE_PREFIX}posts(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS ${TABLE_PREFIX}posts_likes_idx ON ${TABLE_PREFIX}posts(likes)`);
    await client.query(`CREATE INDEX IF NOT EXISTS ${TABLE_PREFIX}comments_post_id_idx ON ${TABLE_PREFIX}comments(post_id)`);
    
    // Generate test data
    const { users, posts, comments } = dataGenerator.generateDataset({
      userCount: 200,
      postCount: 500,
      commentCount: 1000
    });
    
    // Insert users
    const pgUsers = users.map(user => ({
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
    
    const usersCS = new pgp.helpers.ColumnSet([
      'first_name', 'last_name', 'email', 'age',
      'street', 'city', 'state', 'zip_code', 'country',
      'is_active', 'tags', 'metadata'
    ], { table: `${TABLE_PREFIX}users` });
    
    const usersQuery = pgp.helpers.insert(pgUsers, usersCS);
    await db.none(usersQuery);
    
    // Insert posts
    const pgPosts = posts.map((post, index) => ({
      id: index + 1,
      user_id: post.userId,
      title: post.title,
      content: post.content,
      tags: post.tags,
      likes: post.likes,
      views: post.views,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
      is_published: post.isPublished
    }));
    
    const postsCS = new pgp.helpers.ColumnSet([
      'id', 'user_id', 'title', 'content', 'tags',
      'likes', 'views', 'created_at', 'updated_at', 'is_published'
    ], { table: `${TABLE_PREFIX}posts` });
    
    const postsQuery = pgp.helpers.insert(pgPosts, postsCS);
    await db.none(postsQuery);
    
    // Insert comments
    const pgComments = comments.map((comment, index) => ({
      id: index + 1,
      post_id: comment.postId,
      user_id: comment.userId,
      content: comment.content,
      likes: comment.likes,
      created_at: comment.createdAt,
      is_approved: comment.isApproved
    }));
    
    const commentsCS = new pgp.helpers.ColumnSet([
      'id', 'post_id', 'user_id', 'content',
      'likes', 'created_at', 'is_approved'
    ], { table: `${TABLE_PREFIX}comments` });
    
    const commentsQuery = pgp.helpers.insert(pgComments, commentsCS);
    await db.none(commentsQuery);
    
    console.log('PostgreSQL tables created and populated successfully for complex queries benchmark');
  } catch (error) {
    console.error('Error setting up PostgreSQL for complex queries benchmark:', error);
  } finally {
    // Connection is returned to the pool, not closed
    client.release();
  }
}

/**
 * Clean up PostgreSQL environment for the benchmark
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  // Skip if pool is already closed
  if (poolClosed) {
    console.log('PostgreSQL pool already closed, skipping cleanup');
    return;
  }
  
  const client = await pool.connect();
  
  try {
    // Drop tables from this benchmark
    await client.query(`DROP TABLE IF EXISTS ${TABLE_PREFIX}comments CASCADE`);
    await client.query(`DROP TABLE IF EXISTS ${TABLE_PREFIX}posts CASCADE`);
    await client.query(`DROP TABLE IF EXISTS ${TABLE_PREFIX}users CASCADE`);
    
    console.log('PostgreSQL tables cleaned successfully for complex queries benchmark');
  } catch (error) {
    console.error('Error cleaning up PostgreSQL for complex queries benchmark:', error);
  } finally {
    // Connection is returned to the pool, not closed
    client.release();
  }
}

/**
 * Run user posts join query
 * @returns {Promise<Array>} Query results
 */
async function userPostsJoin() {
  try {
    // pg-promise (db) manages connections efficiently
    // Get a random user to search for
    const randomUser = await db.oneOrNone(`
      SELECT id FROM ${TABLE_PREFIX}users
      LIMIT 1
    `);
    
    if (!randomUser) {
      throw new Error('No user found for userPostsJoin test');
    }
    
    // Perform join to get user with their posts
    const results = await db.manyOrNone(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(p.id) AS post_count,
        ARRAY_AGG(
          json_build_object(
            'id', p.id,
            'title', p.title,
            'likes', p.likes,
            'created_at', p.created_at
          )
        ) FILTER (WHERE p.id IS NOT NULL) AS posts
      FROM ${TABLE_PREFIX}users u
      LEFT JOIN ${TABLE_PREFIX}posts p ON u.id = p.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.first_name, u.last_name, u.email
      LIMIT 10
    `, [randomUser.id]);
    
    return results;
  } catch (error) {
    console.error('Error in PostgreSQL userPostsJoin:', error);
    throw error;
  }
  // No need to close connections - pg-promise manages this automatically
}

/**
 * Run popular posts join query
 * @returns {Promise<Array>} Query results
 */
async function popularPostsJoin() {
  try {
    // pg-promise (db) manages connections efficiently
    // Get popular posts with user and comment information
    const results = await db.manyOrNone(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.likes,
        p.views,
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email
        ) AS author,
        COUNT(c.id) AS comment_count,
        ARRAY_AGG(
          json_build_object(
            'id', c.id,
            'content', c.content,
            'created_at', c.created_at,
            'likes', c.likes
          )
        ) FILTER (WHERE c.id IS NOT NULL) AS last_comments
      FROM ${TABLE_PREFIX}posts p
      JOIN ${TABLE_PREFIX}users u ON p.user_id = u.id
      LEFT JOIN ${TABLE_PREFIX}comments c ON p.id = c.post_id
      GROUP BY p.id, p.title, p.content, p.likes, p.views, u.id, u.first_name, u.last_name, u.email
      ORDER BY p.likes DESC
      LIMIT 10
    `);
    
    return results;
  } catch (error) {
    console.error('Error in PostgreSQL popularPostsJoin:', error);
    throw error;
  }
  // No need to close connections - pg-promise manages this automatically
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
      console.log('PostgreSQL connection pool closed for complex-queries benchmark');
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
  userPostsJoin,
  popularPostsJoin,
  closeConnection
}; 