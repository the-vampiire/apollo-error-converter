const { UserInputError, ValidationError } = require('apollo-server-core');

const InvalidFields = {
  message: 'Invalid Felds',
  errorConstructor: UserInputError,
};

const UniqueConstraint = {
  message: 'Unique Violation',
  errorConstructor: ValidationError,
};

// TODO: tests and docs
/**
 *
 * @param {{ baseItem: { message: string, errorConstructor: ApolloError }, data?: function | {}, logger?: boolean | function }} options
 */
const builMapItemValue = (options) => {
  const { baseItem, data, logger } = options;
  return {
    ...baseItem,
    data,
    logger,
  };
};

module.exports = {
  builMapItemValue,
  baseItems: {
    InvalidFields,
    UniqueConstraint,
  },
};
