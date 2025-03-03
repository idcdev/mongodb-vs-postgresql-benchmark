/**
 * Data generator for the find benchmark
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

module.exports = {
  generateUser,
  generateUsers
}; 