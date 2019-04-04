const { ApolloError } = require('apollo-server-core');
const isPlainObject = require('../lodash-is-plain-object');

const {
  defaultLogger,
  defaultFallback,
  mapItemShape: { requiredKeys, optionalKeys },
} = require('./constants');

// TODO: how to import / share type defs?
/**
 * Shapes as of v0.0.1
 * @typedef {{ string: MapItem }} ErrorMap
 * @typedef {[{ key: string, types: [string] } ]} KeyAndShapeList
 * @typedef {{ logger?: boolean | function, fallback?: function | {}, errorMap?: ErrorMap }} ConfigOptions
 * @typedef {{ message: string, errorConstructor: function, logger?: boolean | function, data?: {} | function }} MapItem
 */

/**
 * Checks if the value is one of the list of type strings
 * - handles: [undefined, string, number, boolean, function, array, object]
 *  - object refers to a plain JSO
 * @param {object} value
 * @param {[string]} ofTypes list of type strings
 */
const isOneOfTypes = (value, ofTypes) =>
  ofTypes.some(type => {
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return isPlainObject(value);

    return typeof value === type;
  });

/**
 * Validates the required Map Item field presence and shape
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} requiredKeys
 */
const validateRequiredMapItemFields = (mapItem, requiredKeys) =>
  requiredKeys.every(fieldShape => {
    const { key, types } = fieldShape;
    const mapItemValue = mapItem[key];

    if (mapItemValue === undefined) return false;

    if (key === 'errorConstructor') {
      return isApolloErrorConstructor(mapItemValue);
    }

    return isOneOfTypes(mapItemValue, types);
  });

/**
 * Validates the optional Map Item field shapes
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} optionalKeys
 */
const validateOptionalMapItemFields = (mapItem, optionalKeys) =>
  optionalKeys.every(fieldShape => {
    const { key, types } = fieldShape;
    const mapItemValue = mapItem[key];

    if (mapItemValue === undefined) return true;

    return isOneOfTypes(mapItemValue, types);
  });

/**
 * Validates an individual entry in the merged Error Map
 * - validates each required and optional field + shape
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} requiredKeys list of required keys/shapes
 * @param {KeyAndShapeList} optionalKeys list of optional keys/shapes
 * @returns {boolean}
 */
const isMapItemValid = (mapItem, requiredKeys, optionalKeys) =>
  validateRequiredMapItemFields(mapItem, requiredKeys) &&
  validateOptionalMapItemFields(mapItem, optionalKeys);

/**
 * Validates every Map Item entry in a merged Error Map
 * - validates shape of required and optional fields
 * - throws Error at first Map Item that fails validation
 * @param {{ string: MapItem }} errorMap merged map of 'ErrorName': MapItem entries
 * @param {KeyAndShapeList} requiredKeys list of required keys/shapes
 * @param {KeyAndShapeList} optionalKeys list of optional keys/shapes
 * @throws {Error} Invalid Error Map Item - key: [${key}] value: [${value}]
 * @returns {ErrorMap} a valid ErrorMap
 */
const validateErrorMap = (errorMap, requiredKeys, optionalKeys) => {
  for (const [key, value] of Object.entries(errorMap)) {
    const isValid = isMapItemValid(value, requiredKeys, optionalKeys);

    if (!isValid) {
      throw new Error(
        `Invalid Error Map Item - item key: [${key}] item value: [${JSON.stringify(
          value,
        )}]`,
      );
    }
  }

  return errorMap;
};

/**
 * Consumes and merges ErrorMap Object(s)
 * - from an Array of individual ErrorMaps
 * - a single pre-merged ErrorMap
 * @param {[ErrorMap] | ErrorMap} errorMaps
 * @returns {ErrorMap} Array: merges all ErrorMap elements into one Object
 * @returns {ErrorMap} Object: returns the merged Object
 */
const mergeErrorMaps = errorMaps => {
  if (Array.isArray(errorMaps)) {
    return errorMaps.reduce((mergedMap, errorMap) => {
      validateErrorMap(errorMap, requiredKeys, optionalKeys);
      return Object.assign(mergedMap, errorMap);
    }, {});
  }

  return errorMaps;
};

/**
 * Ensures the fallback is either
 * - a valid MapItem configuration
 * - an ApolloError constructor
 * @param {MapItem | function} fallback
 * @returns {boolean} result of validity test
 */
const fallbackIsValid = fallback => {
  if (!fallback) return false;

  if (isPlainObject(fallback)) {
    return isMapItemValid(fallback, requiredKeys, optionalKeys);
  }

  return isApolloErrorConstructor(fallback);
};

/**
 * Determines if the constructor is an ApolloError or subclass
 * @param {function} constructor the constructor function to test
 * @returns {boolean}
 */
const isApolloErrorConstructor = constructor => {
  if (constructor === ApolloError) return true;
  return constructor.prototype instanceof ApolloError;
};

/**
 * Parses configuration options for ApolloErrorConverter construction
 * - all are optional and use defaults for simple construction
 * @param {ConfigOptions} options
 */
const parseConfigOptions = options => {
  const { logger, fallback, errorMaps } = options;

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
            { ...defaultFallback, errorConstructor: fallback }
          : // fallback is a valid ErrorMapItem Object use instead
            fallback;
    } else {
      console.warn('Invalid fallback option. Using default fallback');
    }
  }

  if (errorMaps) {
    const mergedMap = mergeErrorMaps(errorMaps);
    config.errorMap = validateErrorMap(mergedMap, requiredKeys, optionalKeys);
  }

  return config;
};

module.exports = {
  parseConfigOptions,
  isApolloErrorConstructor,

  errorMaps: {
    isOneOfTypes,
    isMapItemValid,
    mergeErrorMaps,
    fallbackIsValid,
    validateErrorMap,
    validateRequiredMapItemFields,
    validateOptionalMapItemFields,
  },
};
