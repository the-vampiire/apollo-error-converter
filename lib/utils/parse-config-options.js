const {
  isOneOfTypes,
  mergeErrorMaps,
  fallbackIsValid,
  validateErrorMap,
} = require("./utils");

const {
  defaultLogger,
  defaultFallback,
  mapItemShape: { requiredKeys, optionalKeys },
} = require("../core/constants");

/**
 * Parses configuration options for ApolloErrorConverter construction
 * - all are optional and use defaults for simple construction
 * @param {ConfigOptions} options
 */
const parseConfigOptions = (options) => {
  /* eslint no-console: 0 */
  const { logger, fallback, errorMap } = options;

  const config = {
    errorMap: {},
    shouldLog: true,
    logger: defaultLogger,
    fallback: defaultFallback,
  };

  if (logger === false) {
    config.shouldLog = false;
  } else if (typeof logger === "function") {
    config.logger = logger;
  } else if (!isOneOfTypes(logger, ["undefined", "boolean", "function"])) {
    console.warn(
      "[Apollo Error Converter] invalid logger option, using default logger",
    );
  }

  if (fallback) {
    if (fallbackIsValid(fallback)) {
      config.fallback = fallback;
    } else {
      console.warn(
        "[Apollo Error Converter] invalid fallback option, using default fallback",
      );
    }
  }

  if (errorMap) {
    const mergedMap = mergeErrorMaps(errorMap);
    config.errorMap = validateErrorMap(mergedMap, requiredKeys, optionalKeys);
  }

  return config;
};

module.exports = parseConfigOptions;
