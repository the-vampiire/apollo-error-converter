const { isMapItemValid } = require('./utils').errorMaps;
const { requiredKeys, optionalKeys } = require('./constants').mapItemShape;

const { UserInputError, ValidationError } = require('apollo-server-core');

const InvalidFields = {
  message: 'Invalid Felds',
  errorConstructor: UserInputError,
};

const UniqueConstraint = {
  message: 'Unique Violation',
  errorConstructor: ValidationError,
};

/**
 * @typedef {{ message: string, errorConstructor: function, logger?: boolean | function, data?: {} | function }} MapItem
 * @typedef {{ baseItem?: MapItem, message?: string, errorConstructor?: function, logger?: boolean | function, data?: {} | function  }} Options
 */

// TODO: tests and docs
/**
 * Builds the MapItem value to map to an Error name
 * - an optional baseItem (from baseItems or your own) can be extended with a different configuration
 * 
 * @throws {Error} "Invalid MapItem configuration" if the built configuration has an invalid format
 * @param {Options} options
 */
const builMapItemValue = options => {
  const {
    data,
    logger,
    message,
    errorConstructor,
    baseItem = {},
  } = options;

  const value = baseItem;

  if (data) value.data = data;
  if (message) value.message = message;
  if (logger !== undefined) value.logger = logger;
  if (errorConstructor) value.errorConstructor = errorConstructor;

  if (!isMapItemValid(value, requiredKeys, optionalKeys)) {
    throw new Error('Invalid MapItem configuration');
  }

  return value;
};

module.exports = {
  builMapItemValue,
  baseItems: {
    InvalidFields,
    UniqueConstraint,
  },
};
