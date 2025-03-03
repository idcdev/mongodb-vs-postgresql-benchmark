/**
 * MongoDB operations for complex queries benchmark
 */

const { MongoClient } = require('mongodb');
const dataGenerator = require('../data-generator');
require('dotenv').config();

// Prefix for collections in this benchmark
const COLLECTION_PREFIX = 'complex_queries_';

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/benchmark';

// Cache MongoDB client to reuse connection
let cachedClient = null;

/**
 * Set up MongoDB environment for the benchmark
 * @param {Object} options Configuration options
 */
async function setup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Create collections for the benchmark
    await db.createCollection(`${COLLECTION_PREFIX}users`);
    await db.createCollection(`${COLLECTION_PREFIX}posts`);
    await db.createCollection(`${COLLECTION_PREFIX}comments`);
    
    // Generate test data
    const { users, posts, comments } = dataGenerator.generateDataset({
      userCount: 200,
      postCount: 500,
      commentCount: 1000
    });
    
    // Insert users
    await db.collection(`${COLLECTION_PREFIX}users`).insertMany(users);
    
    // Transform posts for MongoDB
    const transformedPosts = posts.map((post, index) => {
      return {
        ...post,
        _id: index + 1,
        userId: post.userId
      };
    });
    
    // Insert posts
    await db.collection(`${COLLECTION_PREFIX}posts`).insertMany(transformedPosts);
    
    // Transform comments for MongoDB
    const transformedComments = comments.map((comment, index) => {
      return {
        ...comment,
        _id: index + 1,
        postId: comment.postId,
        userId: comment.userId
      };
    });
    
    // Insert comments
    await db.collection(`${COLLECTION_PREFIX}comments`).insertMany(transformedComments);
    
    // Create indexes
    await db.collection(`${COLLECTION_PREFIX}posts`).createIndex({ userId: 1 });
    await db.collection(`${COLLECTION_PREFIX}posts`).createIndex({ likes: -1 });
    await db.collection(`${COLLECTION_PREFIX}comments`).createIndex({ postId: 1 });
    
    // Store sample IDs for benchmarks using a deterministic approach
    // This is critical for performance and consistency
    const sampleData = {
      // Get the first user (deterministic)
      userId: (await db.collection(`${COLLECTION_PREFIX}users`).find().sort({ _id: 1 }).limit(1).toArray())[0]._id
    };
    
    // Create a collection to store sample IDs
    await db.collection(`${COLLECTION_PREFIX}sample_ids`).insertOne(sampleData);
    
    console.log('MongoDB collections created and populated successfully for complex queries benchmark');
  } catch (error) {
    console.error('Error setting up MongoDB for complex queries benchmark:', error);
  }
  // No client.close() here to keep connection open
}

/**
 * Clean up MongoDB environment for the benchmark
 * @param {Object} options Configuration options
 */
async function cleanup(options = {}) {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Drop collections from this benchmark
    await db.collection(`${COLLECTION_PREFIX}users`).drop();
    await db.collection(`${COLLECTION_PREFIX}posts`).drop();
    await db.collection(`${COLLECTION_PREFIX}comments`).drop();
    
    console.log('MongoDB collections cleaned successfully for complex queries benchmark');
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('No collections to drop for complex queries benchmark');
    } else {
      console.error('Error cleaning up MongoDB for complex queries benchmark:', error);
    }
  }
  
  // Only close the client during final cleanup if requested
  if (options.closeConnection && cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log('MongoDB connection closed for complex queries benchmark');
  }
}

/**
 * Run user posts aggregation
 * @returns {Promise<Array>} Query results
 */
async function userPostsAggregate() {
  const client = await getClient();
  const db = client.db();
  
  try {
    // Get the pre-stored user ID outside of the benchmark measurement
    const sampleData = await db.collection(`${COLLECTION_PREFIX}sample_ids`).findOne({});
    
    if (!sampleData || !sampleData.userId) {
      throw new Error('No sample user ID found');
    }
    
    // BENCHMARK STARTS HERE - Only measure the time of this specific aggregation
    // Perform aggregation to get user with their posts
    const results = await db.collection(`${COLLECTION_PREFIX}users`).aggregate([
      {
        $match: { _id: sampleData.userId }
      },
      {
        $lookup: {
          from: `${COLLECTION_PREFIX}posts`,
          localField: '_id',
          foreignField: 'userId',
          as: 'posts'
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          posts: {
            $map: {
              input: '$posts',
              as: 'post',
              in: {
                _id: '$$post._id',
                title: '$$post.title',
                content: '$$post.content',
                likes: '$$post.likes',
                createdAt: '$$post.createdAt'
              }
            }
          }
        }
      }
    ]).toArray();
    // BENCHMARK ENDS HERE
    
    return results;
  } catch (error) {
    console.error('Error in MongoDB userPostsAggregate:', error);
    throw error;
  }
  // No client.close() here to keep connection open
}

/**
 * Run popular posts aggregation
 * @returns {Promise<Array>} Query results
 */
async function popularPostsAggregate() {
  const client = await getClient();
  const db = client.db();
  
  try {
    // BENCHMARK STARTS HERE - Only measure the time of this specific aggregation
    // Get popular posts with user and comment information
    const results = await db.collection(`${COLLECTION_PREFIX}posts`).aggregate([
      {
        $sort: { likes: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: `${COLLECTION_PREFIX}users`,
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: `${COLLECTION_PREFIX}comments`,
          localField: '_id',
          foreignField: 'postId',
          as: 'comments'
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          content: 1,
          likes: 1,
          createdAt: 1,
          user: { $arrayElemAt: ['$user', 0] },
          commentCount: { $size: '$comments' },
          comments: {
            $slice: ['$comments', 5]
          }
        }
      }
    ]).toArray();
    // BENCHMARK ENDS HERE
    
    return results;
  } catch (error) {
    console.error('Error in MongoDB popularPostsAggregate:', error);
    throw error;
  }
  // No client.close() here to keep connection open
}

/**
 * Get MongoDB client
 * @returns {Promise<MongoClient>} MongoDB client
 */
async function getClient() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000
    });
    
    await cachedClient.connect();
    console.log('MongoDB connection established for complex queries benchmark');
  }
  
  return cachedClient;
}

/**
 * Close MongoDB connection
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log('MongoDB connection closed for complex-queries benchmark');
  }
}

module.exports = {
  setup,
  cleanup,
  userPostsAggregate,
  popularPostsAggregate,
  closeConnection
}; 