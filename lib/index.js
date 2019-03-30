// TODO: how to control debugging / exposing errors?

const errorMapItems = require('./map-items');
const { parseConfigOptions } = require('./utils');
// TODO: tests
/**
 * Contructs a utility for converting all resolver-thrown errors into ApolloError equivalents
 * - logger can be any logging function / method
 * - converts any mapped errors to their MapItem configuration
 * - logs and converts unmapped errors to the fallback MapItem configuration
 * - defaults:
 *  - logger: console.error, only for unmapped errors
 *  - fallback: for unmapped errors
 *    - errorConstructor: ApolloError
 *    - message: Internal Server Error
 * @param {Options} options
 */
function ApolloErrorConverter(options) {
  const { shouldLog, logger, fallback, errorMap } = parseConfigOptions(options);
  this.logger = logger;
  this.fallback = fallback;
  this.errorMap = errorMap;
  this.shouldLog = shouldLog;

  this.handleMappedError = function(error, mapping) {
    const { message, errorConstructor, data, logger } = mapping;

    // at minimum the message will be passed to the constructor
    const args = [message];

    // if logging is enabled
    if (this.shouldLog) {
      // boolean value indicates use of configured logger
      if (logger === true) {
        this.logger(error);
        // if it is a function a specific logger has been chosen
        // for this type of error, pass it the original error
      } else if (typeof logger === 'function') {
        logger(error);
      }
    }

    // if there is a value for the mapping
    // evaluate and push it into args
    if (data !== undefined) {
      // if it is a function pass it the original error to be processed
      if (typeof data === 'function') {
        args.push(data(error));
      } else {
        // otherwise it is an object
        args.push(data);
      }
    }

    // construct the mapped ApolloError passing it the arg(s)
    return new errorConstructor(...args);
  };

  this.handleUnmappedError = function(error) {
    const { message, errorConstructor, logger } = this.fallback;
    // unmapped errors are logged by default unless logging is off
    if (this.shouldLog) {
      logger(error);
    }

    // return the fallback error and message
    return new errorConstructor(message);
  };

  this.formatError = function(error) {
    // if an ApolloError is thrown from a resolver it has been custom handled
    if (isApolloError(error)) {
      // exit early and pass it through
      return error;
    }

    // check and use any existing mapping for this error
    const mapping = this.errorMap[error.name];
    if (mapping) {
      return this.handleMappedError(error, mapping);
    }

    // otherwise use the fallback for unmapped errors
    return this.handleUnmappedError(error);
  };

  return this.formatError;
}

module.exports = {
  errorMapItems,
  ApolloErrorConverter,
};
