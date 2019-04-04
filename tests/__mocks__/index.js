const { ApolloError } = require('apollo-server-core');
const { builMapItemValue, baseItems } = require('../../lib/map-items');

// dummy implementation
const shapeFieldErrors = error => ({ fields: {} });

const InvalidFields = builMapItemValue({
  baseItem: baseItems.InvalidFields,
  data: shapeFieldErrors,
});

const UniqueConstraint = builMapItemValue({
  baseItem: baseItems.UniqueConstraint,
  data: shapeFieldErrors,
  logger: true,
});

const CustomOne = builMapItemValue({
  baseItem: { message: 'a custom one', errorConstructor: ApolloError },
  data: { docID: 'a doc id' },
});

const mongooseErrorMap = {
  ValidatorError: InvalidFields,
  ValidationError: InvalidFields,
  DocumentNotFoundError: CustomOne,
};

const sequelizeErrorMap = {
  SequelizeValidationError: InvalidFields,
  SequelizeUniqueConstraintError: UniqueConstraint,
};

module.exports = {
  mongooseErrorMap,
  sequelizeErrorMap,
};
