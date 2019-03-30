/**
 * Shape as of v1
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
  requiredKeys,
  optionalKeys,
};
