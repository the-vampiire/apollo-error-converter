const { ApolloError } = require('apollo-server-core');

const defaultLogger = console.error;

const defaultFallback = {
  logger: defaultLogger,
  errorConstructor: ApolloError,
  message: 'Internal Server Error',
};

/**
 * Shape as of v0.0.1
 * @typedef {{ message: string, errorConstructor: function, logger?: boolean | function, data?: {} | string | function }} MapItem
 */
const requiredKeys = [
  { key: 'message', types: ['string'] },
  { key: 'errorConstructor', types: ['function'] },
];

const optionalKeys = [
  { key: 'logger', types: ['function', 'boolean'] },
  { key: 'data', types: ['string', 'function', 'object'] },
];

module.exports = {
  defaultLogger,
  defaultFallback,
  mapItemShape: {
    requiredKeys,
    optionalKeys,
  },
};
