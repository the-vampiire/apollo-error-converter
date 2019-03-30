const { ApolloError } = require('apollo-server-core');

const defaultLogger = console.error;

const defaultFallback = {
  logger: defaultLogger,
  errorConstructor: ApolloError,
  message: 'Internal Server Error',
};

const requiredKeys = [
  { key: 'message', types: ['string'] },
  { key: 'errorConstructor', types: ['function'] },
];

const optionalKeys = [
  { key: 'logger', types: ['function', 'boolean'] },
  { key: 'data', types: ['function', 'object'] },
];

module.exports = {
  defaultLogger,
  defaultFallback,
  mapItemShape: {
    requiredKeys,
    optionalKeys,
  },
};
