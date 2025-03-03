/**
 * Data generator for complex queries benchmark
 */

const { faker } = require('@faker-js/faker');

/**
 * Generate a random user
 * @returns {Object} User data
 */
function generateUser() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 80 }),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country()
    },
    isActive: faker.datatype.boolean(),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.word.sample()),
    metadata: {
      lastLogin: faker.date.past(),
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
        notifications: faker.datatype.boolean(),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'pt'])
      }
    }
  };
}

/**
 * Generate multiple users
 * @param {number} count Number of users to generate
 * @returns {Array<Object>} Array of user data
 */
function generateUsers(count) {
  return Array.from({ length: count }, (_, index) => {
    const user = generateUser();
    const emailParts = user.email.split('@');
    user.email = `${emailParts[0]}_${index}_${Date.now()}@${emailParts[1]}`;
    return user;
  });
}

/**
 * Generate a random post
 * @param {number} userId User ID who created the post
 * @returns {Object} Post data
 */
function generatePost(userId) {
  return {
    userId,
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.lorem.word()),
    likes: faker.number.int({ min: 0, max: 1000 }),
    views: faker.number.int({ min: 0, max: 10000 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    isPublished: faker.datatype.boolean()
  };
}

/**
 * Generate multiple posts
 * @param {number} count Number of posts to generate
 * @param {Array<number>} userIds Array of user IDs
 * @returns {Array<Object>} Array of post data
 */
function generatePosts(count, userIds) {
  return Array.from({ length: count }, () => {
    const randomUserIndex = Math.floor(Math.random() * userIds.length);
    return generatePost(userIds[randomUserIndex]);
  });
}

/**
 * Generate a random comment
 * @param {number} postId Post ID the comment belongs to
 * @param {number} userId User ID who created the comment
 * @returns {Object} Comment data
 */
function generateComment(postId, userId) {
  return {
    postId,
    userId,
    content: faker.lorem.paragraph(),
    likes: faker.number.int({ min: 0, max: 100 }),
    createdAt: faker.date.past(),
    isApproved: faker.datatype.boolean()
  };
}

/**
 * Generate multiple comments
 * @param {number} count Number of comments to generate
 * @param {Array<number>} postIds Array of post IDs
 * @param {Array<number>} userIds Array of user IDs
 * @returns {Array<Object>} Array of comment data
 */
function generateComments(count, postIds, userIds) {
  return Array.from({ length: count }, () => {
    const randomPostIndex = Math.floor(Math.random() * postIds.length);
    const randomUserIndex = Math.floor(Math.random() * userIds.length);
    return generateComment(postIds[randomPostIndex], userIds[randomUserIndex]);
  });
}

/**
 * Generate a complete dataset for complex queries benchmark
 * @param {Object} options Dataset size options
 * @returns {Object} Dataset with users, posts, and comments
 */
function generateDataset({ userCount = 100, postCount = 500, commentCount = 1000 } = {}) {
  // Generate users
  const users = generateUsers(userCount);
  
  // Generate user IDs (1 to userCount)
  const userIds = Array.from({ length: userCount }, (_, i) => i + 1);
  
  // Generate posts
  const posts = generatePosts(postCount, userIds);
  
  // Generate post IDs (1 to postCount)
  const postIds = Array.from({ length: postCount }, (_, i) => i + 1);
  
  // Generate comments
  const comments = generateComments(commentCount, postIds, userIds);
  
  return {
    users,
    posts,
    comments
  };
}

module.exports = {
  generateUser,
  generateUsers,
  generatePost,
  generatePosts,
  generateComment,
  generateComments,
  generateDataset
}; 