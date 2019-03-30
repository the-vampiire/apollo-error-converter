const isPlainObject = require('lodash/isPlainObject');

const {
  defaultLogger,
  defaultFallback,
  mapItemShape: { requiredKeys, optionalKeys },
} = require('./constants');

const {
  isApolloErrorConstructor,
  errorMap: { validateErrorMap, isMapItemValid, isOneOfTypes },
} = require('./utils');

const parseOptions = options => {
  const { logger, fallback, errorMaps } = options;

  const config = { shouldLog: true, logger: defaultLogger, fallback: defaultFallback, errorMap: {} };
  
  if (logger === false) {
    config.shouldLog = false;
  } else if (typeof logger === 'function') {
    config.logger = logger;
  }

  if (fallback && fallbackIsValid(fallback)) {
    config.fallback = fallback;
  }

  if (errorMaps) {
    config.errorMap = mergeErrorMaps(errorMaps);
  }

  return config;
};

function rethrowAsApollo(options) {
  const { logger, fallback, errorMaps } = options;

  this._useLogger = logger !== false;
  this.logger =
    logger === undefined || logger === true ? defaultLogger : logger;

  this.fallback = fallback || defaultFallback;

  this.errorMap = Array.isArray(errorMaps)
    ? mergeErrorMaps(errorMaps)
    : errorMaps;

  this.formatError = function(error) {};

  return this.formatError;
}
