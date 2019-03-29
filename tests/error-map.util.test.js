const {
  isOneOfTypes,
  isErrorMapValid,
  isMapeItemValid,
  validateRequiredMapItemFields,
  validateOptionalMapItemFields,
} = require('../lib/utils').errorMap;

const { ApolloError } = require('apollo-server-core');
jest.mock('apollo-server-core', () => ({ ApolloError: 'ApolloError' }));

describe('isOneOfTypes: Checks if the value is one of the list of type strings', () => {
  describe('of supported types: [string, number, function, boolean, array, object]', () => {
    const ofTypes = [
      'string',
      'number',
      'function',
      'boolean',
      'array',
      'object',
    ];

    const tests = {
      string: 'a string',
      number: 2.1,
      function: () => {},
      boolean: true,
      array: [],
      object: {},
    };

    Object.entries(tests).forEach(([type, value]) =>
      test(`type: ${type}`, () =>
        expect(isOneOfTypes(value, ofTypes)).toBe(true)),
    );
  });
});

describe('validateRequiredMapItemFields: Validates the required Map Item fields presence and shape', () => {
  // arbitrary
  const requiredKeys = [
    { key: 'constructor', types: ['function'] },
    { key: 'someKey', types: ['string', 'function', 'object'] },
    { key: 'someOther', types: ['array', 'function', 'object'] },
  ];

  test('has fields and correct shape: returns true', () => {
    const mapItem = {
      constructor: 'ApolloError',
      someKey: () => {},
      someOther: [],
    };

    const result = validateRequiredMapItemFields(mapItem, requiredKeys);
    expect(result).toBe(true);
  });

  test('has fields and correct shape 2: returns true', () => {
    // expected shape as of v1
    const requiredKeys = [
      { key: 'message', types: ['string'] },
      { key: 'constructor', types: ['function'] },
    ];
    const mapItem = { message: 'error message', constructor: ApolloError };

    const result = validateRequiredMapItemFields(mapItem, requiredKeys);
    expect(result).toBe(true);
  });

  test('has fields with incorrect shape: returns false', () => {
    const mapItem = { constructor: 'ApolloError', someKey: 5, someOther: [] };

    const result = validateRequiredMapItemFields(mapItem, requiredKeys);
    expect(result).toBe(false);
  });

  test('missing a required field: returns false', () => {
    const mapItem = { constructor: 'ApolloError' };

    const result = validateRequiredMapItemFields(mapItem, requiredKeys);
    expect(result).toBe(false);
  });
});

describe('validateOptionalMapItemFields: Validates the optional Map Item field shapes', () => {
  // arbitrary
  const optionalKeys = [
    { key: 'aKey', types: ['function', 'object', 'boolean'] },
    { key: 'someStuff', types: ['number', 'string', 'object'] },
  ];

  test('no optional fields: returns true', () => {
    const mapItem = { requiredField: 'correct' };

    const result = validateOptionalMapItemFields(mapItem, optionalKeys);
    expect(result).toBe(true);
  });

  test('optional field missing + others have valid shape: returns true', () => {
    const mapItem = { requiredField: 'correct', someStuff: {} };

    const result = validateOptionalMapItemFields(mapItem, optionalKeys);
    expect(result).toBe(true);
  });

  test('all optional fields and shapes correct: returns true', () => {
    // expected shape as of v1
    const optionalKeys = [
      { key: 'logger', types: ['function', 'boolean'] },
      { key: 'data', types: ['string', 'function', 'object'] },
    ];
    const mapItem = { requiredField: 'correct', logger: () => {}, data: () => {} };
    
    const result = validateOptionalMapItemFields(mapItem, optionalKeys);
    expect(result).toBe(true);
  });

  test('optional field has invalid shape: returns false', () => {
    const mapItem = { requiredField: 'correct', aKey: [] };

    const result = validateOptionalMapItemFields(mapItem, optionalKeys);
    expect(result).toBe(false);
  });
});
