const { toApolloError } = require("apollo-server-core");
const { defaultFallback } = require("../core/constants");

/**
 * Extracts and shapes the arguments for formatting the Error
 *
 * defaults:
 * - data = null
 * - code = 'INTERNAL_SERVER_ERROR'
 * @param {GraphQLError} error GraphQL Error from formatError
 * @param {MapItem} mapItem MapItem to parse
 * @returns {[object]} arguments list
 */
function createApolloError(graphQLError, mapItem) {
  const { originalError, path, locations } = graphQLError;
  const { message, data = {}, code = defaultFallback.code } = mapItem;

  return toApolloError({
    path,
    message,
    locations,
    extensions: {
      data: typeof data === "function" ? data(originalError) : data,
    },
  }, code);
}

module.exports = createApolloError;
