const {
  getMapItem,
  parseConfigOptions,
  handleMappedError,
  handleUnmappedError,
  shouldErrorPassThrough,
} = require("../utils");

/**
 * @typedef {{ string: MapItem }} ErrorMap
 * @typedef {{ message: string, code?: string, logger?: boolean | function, data?: {} | function }} MapItem
 */

/**
 * Contructs a function for automatically converting all resolver-thrown errors into ApolloError equivalents
 * The returned function should be assigned to the ApolloServer constructor options.formatError field
 *
 * Behaviors of Errors thrown from resolvers (or underlying resolver calls)
 * - Mapped Error thrown (error.[name, code, type] mapping found in errorMap)
 *   - only logs if instructed in the mapped MapItem configuration
 *   - converts to ApolloError according to MapItem configuration
 * - Unmapped Error thrown (Error mapping not found in errorMap)
 *   - logs the Error using options.logger / default logger
 *   - converts to ApolloError according to options.fallback MapItem
 * - ApolloError thrown (indicates Error handling was implemented in the resolver)
 *   - does not log
 *   - passes any ApolloError through
 * - debug mode enabled
 *   - passes all Errors through (does not process any Errors)
 *
 * Options defaults
 * - debug: false
 * - errorMap: {}
 * - logger: console.error
 * - fallback:
 *   - code: "INTERNAL_SERVER_ERROR"
 *   - message: "Internal Server Error"
 *   - logger: options.logger or default logger
 * @param options
 * @param {ErrorMap | [ErrorMap]} options.errorMap used for Mapped Errors, Arrays are merged into a single ErrorMap object
 * @param {FallbackMapItem | function} options.fallback MapItem used for Unmapped Errors
 * @param {boolean | function} options.logger: false to disable logging (Mapped & Unmapped), true to use default logger, or a function which accepts an Error object
 * @param {boolean} debug [false] if true, does nothing (passes all Errors through)
 *
 * @example
 * const { ApolloErrorConverter } = require('apollo-error-converter');
 *
 * const options = {
 *   errorMap: // (optional) { errorName: MapItem, errorCode: MapItem, ... } or [ErrorMap, ...]
 *   logger: // (optional) function for logging Errors
 *   fallback: // (optional) MapItem used as a fallback for Unmapped Errors
 * }
 *
 * ...
 *
 * new ApolloServer({
 *   ...
 *   formatError: new ApolloErrorConverter(options),
 *   // formatError: new ApolloErrorConverter(), uses all defaults with no Mapped Errors
 *   // formatError: new ApolloErrorConverter(options, true), enabled debug mode
 * });
 */
function ApolloErrorConverter(options = {}, debug = false) {
  const configuration = parseConfigOptions(options);
  Object.entries(configuration).forEach((entry) => {
    const [option, value] = entry;
    this[option] = value;
  });

  this.getMapItem = getMapItem.bind(this);
  this.handleMappedError = handleMappedError.bind(this);
  this.handleUnmappedError = handleUnmappedError.bind(this);

  function formatError(graphQLError) {
    const { originalError } = graphQLError;

    if (shouldErrorPassThrough(debug, originalError)) {
      return graphQLError;
    }

    // check for a MapItem configured for this Error
    const mapItem = this.getMapItem(originalError);

    return mapItem
      ? this.handleMappedError(graphQLError, mapItem)
      : this.handleUnmappedError(graphQLError);
  }

  return formatError.bind(this);
}

module.exports = ApolloErrorConverter;
