const isPlainObject = require("./lodash-is-plain-object");

// TODO: discuss whether GraphQL syntax / schema errors should be passed through, logged, ignored?

/**
 * Controls whether an Error should be passed through without being processed by AEC
 *
 * conditions to pass through:
 * - debug mode enabled
 * - original Error is an ApolloError instance (custom handled in resolver)
 * - [DISCUSS] GraphQL syntax or schema error (empty originalError)
 * @param {boolean} debug debug mode flag
 * @param {Error} originalError original Error object
 */
const shouldErrorPassThrough = (debug, originalError) => debug
  || originalError.extensions !== undefined // ApolloErrors set this property
  // TODO: confirm, does this handle all GraphQL syntax / schema errors?
  || (isPlainObject(originalError) && Object.keys(originalError).length === 0);

module.exports = shouldErrorPassThrough;
