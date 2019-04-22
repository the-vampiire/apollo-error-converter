const {
  isOneOfTypes,
  fallbackIsValid,
  mergeErrorMaps,
  validateErrorMap,
} = require('./utils');

const {
  defaultLogger,
  defaultFallback,
  mapItemShape: { requiredKeys, optionalKeys },
} = require('./constants');

/**
 * Parses configuration options for ApolloErrorConverter construction
 * - all are optional and use defaults for simple construction
 * @param {ConfigOptions} options
 */
const parseConfigOptions = options => {
  const { logger, fallback, errorMap } = options;

  const config = {
    errorMap: {},
    shouldLog: true,
    logger: defaultLogger,
    fallback: defaultFallback,
  };

  if (logger === false) {
    config.shouldLog = false;
  } else if (typeof logger === 'function') {
    config.logger = logger;
  } else if (!isOneOfTypes(logger, ['undefined', 'boolean', 'function'])) {
    console.warn('Invalid logger option. Using default logger');
  }

  if (fallback) {
    if (fallbackIsValid(fallback)) {
      config.fallback =
        typeof fallback === 'function'
          ? // fallback is a single constructor, merge with default
            {
              ...defaultFallback,
              logger: config.logger,
              errorConstructor: fallback,
            }
          : // fallback is a valid ErrorMapItem Object use instead
            fallback;
    } else {
      console.warn('Invalid fallback option. Using default fallback');
    }
  }

  if (errorMap) {
    const mergedMap = mergeErrorMaps(errorMap);
    config.errorMap = validateErrorMap(mergedMap, requiredKeys, optionalKeys);
  }

  return config;
};

module.exports = parseConfigOptions;
