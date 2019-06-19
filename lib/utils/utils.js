const isPlainObject = require("./lodash-is-plain-object");
const {
  requiredKeys,
  optionalKeys,
} = require("../core/constants").mapItemShape;

// TODO: how to import / share type defs?
/**
 * Shapes as of v0.0.1
 * @typedef {{ string: MapItem }} ErrorMap
 * @typedef {[{ key: string, types: [string] } ]} KeyAndShapeList
 * @typedef {{ logger?: boolean | function, fallback?: MapItem, errorMap?: ErrorMap || [ErrorMap] }} ConfigOptions
 * @typedef {{ message: string, logger?: boolean | function, data?: {} | function, code?: string }} MapItem
 */

/**
 * Checks if the value is one of the list of type strings
 * - handles: [undefined, string, number, boolean, function, array, object]
 *  - object refers to a plain JSO
 * @param {object} value
 * @param {string[]} ofTypes list of type strings
 */
const isOneOfTypes = (value, ofTypes) => ofTypes.some((type) => {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isPlainObject(value);
  /* eslint valid-typeof: "error" */
  return typeof value === type;
});

/**
 * Validates the required Map Item field presence and shape
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} required
 */
const validateRequiredMapItemFields = (mapItem, required) => required.every((fieldShape) => {
  const { key, types } = fieldShape;
  const mapItemValue = mapItem[key];

  if (mapItemValue === undefined) return false;

  return isOneOfTypes(mapItemValue, types);
});

/**
 * Validates the optional Map Item field shapes
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} optional
 */
const validateOptionalMapItemFields = (mapItem, optional) => optional.every((fieldShape) => {
  const { key, types } = fieldShape;
  const mapItemValue = mapItem[key];

  if (mapItemValue === undefined) return true;

  return isOneOfTypes(mapItemValue, types);
});

/**
 * Validates an individual entry in the merged Error Map
 * - validates each required and optional field + shape
 * @param {MapItem} mapItem
 * @param {KeyAndShapeList} required list of required keys/shapes
 * @param {KeyAndShapeList} optional list of optional keys/shapes
 * @returns {boolean}
 */
const isMapItemValid = (mapItem, required, optional) => validateRequiredMapItemFields(mapItem, required)
  && validateOptionalMapItemFields(mapItem, optional);

/**
 * Validates every Map Item entry in a merged Error Map
 * - validates shape of required and optional fields
 * - throws Error at first Map Item that fails validation
 * @param {{ string: MapItem }} errorMap merged map of { 'ErrorName': MapItem } entries
 * @param {KeyAndShapeList} required list of required MapItem keys/shapes
 * @param {KeyAndShapeList} optional list of optional MapItem keys/shapes
 * @throws {Error} Invalid Error Map Item - key: [${key}] value: [${value}]
 * @returns {ErrorMap} a valid ErrorMap
 */
const validateErrorMap = (errorMap, required, optional) => {
  Object.entries(errorMap).forEach((entry) => {
    const [errorMapping, mapItem] = entry;
    const isValid = isMapItemValid(mapItem, required, optional);

    if (!isValid) {
      throw new Error(
        `Invalid Error Map Item - item mapping: [${errorMapping}] item value: [${JSON.stringify(
          mapItem,
        )}]`,
      );
    }
  });
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
const mergeErrorMaps = (errorMaps) => {
  if (Array.isArray(errorMaps)) {
    return errorMaps.reduce((mergedMap, errorMap) => {
      validateErrorMap(errorMap, requiredKeys, optionalKeys);
      return Object.assign(mergedMap, errorMap);
    }, {});
  }

  return errorMaps;
};

/**
 * Ensures the fallback is a valid MapItem configuration
 * @param {MapItem} fallback
 * @returns {boolean} result of validity test
 */
const fallbackIsValid = fallback => Boolean(fallback) && isMapItemValid(fallback, requiredKeys, optionalKeys);

module.exports = {
  isOneOfTypes,
  isMapItemValid,
  mergeErrorMaps,
  fallbackIsValid,
  validateErrorMap,
  validateRequiredMapItemFields,
  validateOptionalMapItemFields,
};
