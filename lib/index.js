const errorMapItems = require('./map-items');
const { parseConfigOptions } = require('./utils');
const { ApolloError } = require('apollo-server-core');

/**
 * Contructs a utility for converting all resolver-thrown errors into ApolloError equivalents
 * - logger can be any logging function / method which accepts an Error object
 * - Mapped Errors behavior
 *   - converts to ApolloError defined in the corresponding MapItem configuration
 *   - only logs if defined in the MapItem configuration
 * - Unmapped Errors behavior
 *   - converts to ApolloError from fallback configuration
 *   - logs the Error
 * - ApolloError behavior
 *   - passes any ApolloError/subclass through
 *   - does not log
 * - defaults:
 *  - logger: console.error
 *  - fallback MapItem configuration: for unmapped errors
 *    - errorConstructor: ApolloError
 *    - message: Internal Server Error
 *    = logs: using logger
 * @param {Options} options
 * @param {boolean} debug [false] if true, does nothing (passes all Errors through)
 */
function ApolloErrorConverter(options = {}, debug = false) {
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
    const { message, logger, errorConstructor } = this.fallback;

    // unmapped errors are logged by default unless logging is off
    if (this.shouldLog) {
      logger(error);
    }

    // return the fallback error and message
    return new errorConstructor(message);
  };

  this.formatError = function(error) {
    // if debug mode is on do nothing
    // if an ApolloError is thrown from a resolver it has been custom handled
    if (debug || error instanceof ApolloError) {
      // exit early and pass the Error through
      return error;
    }

    // check and use any existing mapping for this error
    // idea: lookup by name / code?
    const mapping = this.errorMap[error.name];
    if (mapping) {
      return this.handleMappedError(error, mapping);
    }

    // otherwise use the fallback for unmapped errors
    return this.handleUnmappedError(error);
  };

  return this.formatError.bind(this);
}

module.exports = {
  errorMapItems,
  ApolloErrorConverter,
};
