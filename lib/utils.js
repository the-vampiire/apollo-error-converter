const { ApolloError } = require('apollo-server-core');
const isPlainObject = require('lodash/isPlainObject');

/**
 * Shapes as of v1
 * @typedef {{ message: string, errorConstructor: function, logger?: boolean | function, data?: {} | string | function }} MapItem
 * @typedef {[{ key: string, types: [string] } ]} KeyAndShapeList
 */

/**
 * Checks if the value is one of the list of type strings
 * - handles: [string, number, boolean, function, array, object]
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
 * @param {{ string: MapItem }} map merged map of 'ErrorName': MapItem entries
 * @param {KeyAndShapeList} requiredKeys list of required keys/shapes
 * @param {KeyAndShapeList} optionalKeys list of optional keys/shapes
 * @throws {Error} Invalid Error Map Item - key: [${key}] value: [${value}]
 */
const validateErrorMap = (map, requiredKeys, optionalKeys) => {
  for (const [key, value] of Object.entries(map)) {
    const isValid = isMapItemValid(value, requiredKeys, optionalKeys);

    if (!isValid) {
      throw new Error(
        `Invalid Error Map Item - key: [${key}] value: [${value}]`,
      );
    }
  }
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

module.exports = {
  isApolloErrorConstructor,
  errorMap: {
    isOneOfTypes,
    validateErrorMap,
    isMapItemValid,
    validateRequiredMapItemFields,
    validateOptionalMapItemFields,
  },
};
