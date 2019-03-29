const { ApolloError } = require('apollo-server-core');
const isPlainObject = require('lodash/isPlainObject');

/**
 * Checks if the value is one of the list of type strings
 * - handles: [string, number, boolean, function, array, object]
 *  - object refers to a plain JSO
 * @param {object} value
 * @param {[string]} ofTypes list of type strings
 */
const isOneOfTypes = (value, ofTypes) => ofTypes.some(type => {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isPlainObject(value);

  return typeof value === type;
});

/**
 * Validates the required Map Item field presence and shape
 * @param {MapItem} mapItem
 * @param {[{ key: string, types: [string] } ]} requiredKeys
 */
const validateRequiredMapItemFields = (mapItem, requiredKeys) =>
  requiredKeys.every(fieldShape => {
    const { key, types } = fieldShape;
    const mapItemValue = mapItem[key];

    if (mapItemValue === undefined) return false;
    if (key === 'constructor') return isApolloErrorConstructor(mapItemValue);
    
    return isOneOfTypes(mapItemValue, types);
  });

/**
 * Validates the optional Map Item field shapes
 * @param {MapItem} mapItem
 * @param {[{ key: string, types: [string] } ]} optionalKeys
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
 * - validates each required and optional field shape
 * - !! holds master list of required and optional field shapes !!
 * @typedef {{ message: string, constructor: function, logger?: boolean | function, data?: {} | string | function }} MapItem
 * @param {MapItem} mapItem
 * @returns {boolean}
 */
const isMapItemValid = mapItem => {
  // master lists of required and optional keys
  const requiredKeys = [
    { key: 'message', types: ['string'] },
    { key: 'constructor', types: ['function'] },
  ];

  const optionalKeys = [
    { key: 'logger', types: ['function', 'boolean'] },
    { key: 'data', types: ['string', 'function', 'object'] },
  ];

  return (
    isApolloErrorConstructor(mapItem.constructor) &&
    validateRequiredMapItemFields(mapItem) &&
    validateOptionalMapItemFields(mapItem)
  );
};

/**
 * Validates every entry in a merged Error Map
 * - validates shape of required and optional fields
 * - throws Error at first Map Item that fails validation
 * @param {*} map
 * @throws {Error} Invalid Error Map Item - key: [${key}] value: [${value}]
 * @returns {boolean} true if entire Error Map is valid
 */
const isErrorMapValid = map => {
  for (const [key, value] of Object.entries(map)) {
    if (!isMapItemValid(value)) {
      throw new Error(
        `Invalid Error Map Item - key: [${key}] value: [${value}]`,
      );
    }
  }

  return true;
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
    isErrorMapValid,
    isMapItemValid,
    validateRequiredMapItemFields,
    validateOptionalMapItemFields,
  },
};
