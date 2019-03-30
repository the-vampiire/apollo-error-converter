const { ApolloError, UserInputError, ValidationError } = require('apollo-server-core');

const errorMap = {
  SequelizeValidationError: {
    message: 'Invalid Felds',
    errorConstructor: UserInputError,
    data: error => shapeFieldErrors(error),
    logger: true,
  },

  SequelizeUniqueConstraintError: {
    message: 'Unique Violation',
    errorConstructor: ValidationError,
    data: error => shapeFieldErrors(error),
    logger: console.warn,
  },

  SomeCustomError: {
    message: 'a custom one',
    errorConstructor: ApolloError,
    logger: false,
  }
};

module.exports = {
  errorMap,
};
