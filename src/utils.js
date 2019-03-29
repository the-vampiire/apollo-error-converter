const { ApolloError } = require('apollo-server-core');

/**
 * Determines if the constructor is an ApolloError or subclass
 * @param {function} constructor the constructor function to test
 * @returns {boolean}
 */
const isApolloErrorConstructor = (constructor) => {
  if (constructor === ApolloError) return true;
  return constructor.prototype instanceof ApolloError;
}

module.exports = {
  isApolloErrorConstructor,
};