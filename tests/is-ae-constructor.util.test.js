const {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  ValidationError,
} = require('apollo-server-core');

const { isApolloErrorConstructor } = require('../lib/utils');

describe('isApolloErrorConstructor: Determines if the constructor is an ApolloError or subclass', () => {
  describe('valid standard ApolloError/subclass constructors', () => {
    [
      ApolloError,
      AuthenticationError,
      ForbiddenError,
      UserInputError,
      ValidationError,
    ].forEach(constructor =>
      test(`returns true for: ${constructor.name}`, () =>
        expect(isApolloErrorConstructor(constructor)).toBe(true)),
    );
  });

  describe('valid custom extended ApolloError constructor', () => {
    class CustomConstructor extends ApolloError {
      constructor(message, code, properties) {
        super('A Custom ApolloError!', code, properties);
      }
    }

    test('returns true', () =>
      expect(isApolloErrorConstructor(CustomConstructor)).toBe(true));
  });

  describe('valid custom extended ApolloError subclass constructor', () => {
    class CustomSubclassConstructor extends UserInputError {
      constructor(message, properties) {
        super('A Custom ApolloError subclass!', properties);
      }
    }

    test('returns true', () =>
      expect(isApolloErrorConstructor(CustomSubclassConstructor)).toBe(true));
  });

  describe('invalid non ApolloError Error constructors', () => {
    test('returns false', () =>
      [Error, SyntaxError, ReferenceError, TypeError].forEach(constructor =>
        expect(isApolloErrorConstructor(constructor)).toBe(false),
      ));
  });
});
