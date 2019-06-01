const { ApolloError } = require("apollo-server-core");

const getMapItem = require("./get-map-item");
const parseConfigOptions = require("./parse-config-options");
const { handleUnmappedError, handleMappedError } = require("./error-handlers");

/**
 * @typedef {{ string: MapItem }} ErrorMap
 * @typedef {{ errorConstructor: function, message: string, logger?: boolean | function, code: string, data?: {} | function }} MapItem
 */

/**
 * Contructs a function for automatically converting all resolver-thrown errors into ApolloError equivalents
 * Tthe returned function should be assigned to the ApolloServer options.formatError field
 *
 * - allows for simpler resolver functions / underlying methods that do not need to provide any Error handling
 *  - any ApolloError thrown from a resolver will be passed through untouched to allow resolver handling if needed
 * - an Error Map can be provided to handle specific Errors defined by their corresponding MapItem
 *  - internal: logs original UnMapped Errors and Mapped Errors (that are configured to be logged)
 *  - public: hides implementation details from original Error messages, names, and stack traces
 * - all Errors thrown from within a resolver are captured by formatError and handled as described below
 *
 * Behaviors of Errors thrown from resolvers
 * - Mapped Error thrown (Error.name or Error.code match found in errorMap)
 *   - only logs if instructed in the corresponding MapItem configuration
 *   - converts to ApolloError defined in the corresponding MapItem configuration
 * - Unmapped Error thrown (Error.name match not found in errorMap)
 *   - logs the Error using options.logger / default logger
 *   - converts to ApolloError defined in the options.fallback MapItem
 * - ApolloError thrown (indicates Error handling was implemented in the resolver)
 *   - does not log
 *   - passes any ApolloError through
 *
 * Options defaults
 * - debug: false
 * - errorMap: {}
 * - logger: console.error
 * - fallback:
 *   - errorConstructor: ApolloError
 *   - message: "Internal Server Error"
 *   - logger: options.logger / default logger
 * @param options
 * @param {ErrorMap | [ErrorMap]} options.errorMap used for Mapped Errors, Arrays are merged into a single ErrorMap object
 * @param {FallbackMapItem | function} options.fallback used for Unmapped Errors, MapItem or ApolloError constructor function
 * @param {boolean | function} options.logger: false to disable logging (Mapped & Unmapped), true to use default logger, or a function which accepts an Error object
 * @param {boolean} debug [false] if true, does nothing (passes all Errors through)
 *
 * @example
 * // some Error MapItem objects are provided (optional)
 * const { ApolloErrorConverter } = require('apollo-error-converter');
 *
 * const options = { // (optional)
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
 *   // formatError: new ApolloErrorConverter(options, true), sets debug mode on
 * });
 */
function ApolloErrorConverter(options = {}, debug = false) {
  const configuration = parseConfigOptions(options);
  for (const [option, value] of Object.entries(configuration)) {
    this[option] = value;
  }

  this.getMapItem = getMapItem.bind(this);
  this.handleMappedError = handleMappedError.bind(this);
  this.handleUnmappedError = handleUnmappedError.bind(this);

  return function formatError(graphQLError) {
    const { originalError } = graphQLError;

    // if debug mode is on pass all errors through
    // if an ApolloError is thrown from a resolver it has been custom handled
    if (debug || originalError instanceof ApolloError) {
      // exit early and pass the GraphQLError through
      return graphQLError;
    }

    // check for a MapItem configured for this Error
    const mapItem = this.getMapItem(originalError);

    return mapItem
      ? this.handleMappedError(originalError, mapItem)
      : this.handleUnmappedError(originalError);
  }.bind(this);
}

module.exports = ApolloErrorConverter;
