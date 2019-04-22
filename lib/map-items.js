const { UserInputError, ValidationError } = require('apollo-server-core');

const { isMapItemValid } = require('./utils');
const { requiredKeys, optionalKeys } = require('./constants').mapItemShape;

/**
 * 
 * - if a new MapItem is being built the following fields are required:
 *  - message
 *  - errorConstructor
 * 
 * most ApolloErrors ignore the options.data and options.code fields except:
 * - UserInputError
 * - ApolloError (base class)
 *
 * @throws {Error} "Invalid MapItem configuration" if the built configuration has an invalid format
 * @param {{ baseItem?: {}, message?: string, errorConstructor?: function, logger?: boolean | function, data?: {} | function  }} options
 */
const extendMapItem = (baseItem, configuration) => {
  const mapItem = { ...baseItem, ...configuration };

  if (!isMapItemValid(mapItem, requiredKeys, optionalKeys)) {
    throw new Error('Invalid MapItem configuration');
  }

  return mapItem;
};

/**
 * ApolloError: UserInputError
 * - accepts MapItem.data field
 */
const InvalidFields = {
  message: 'Invalid Fields',
  errorConstructor: UserInputError,
};

/**
 * ApolloError: ValidationError
 * - does not accept MapItem.data field
 */
const UniqueConstraint = {
  message: 'Unique Violation',
  errorConstructor: ValidationError,
};

// TODO: Sequelize and Mongoose errorMaps, separate from package?
const mapItems = {};

module.exports = {
  extendMapItem,
  mapItemBases: {
    InvalidFields,
    UniqueConstraint,
  },
};
