const { ForbiddenError } = require('apollo-server-core');

const parseConfigOptions = require('../lib/parse-config-options');
const { defaultFallback, defaultLogger } = require('../lib/constants');

const warnSpy = jest.spyOn(console, 'warn');

describe('parseConfigOptions: Parses configuration options for ApolloErrorConverter construction', () => {
  afterEach(() => jest.clearAllMocks());

  describe('config.shouldLog: controls whether logging should occur in mapped (ErrorMapItem logging option) and unmapped Errors', () => {
    test('options.logger = false -> config.shouldLog = false', () => {
      const options = { logger: false };
      const config = parseConfigOptions(options);
      expect(config.shouldLog).toBe(false);
    });

    test('options.logger = undefined -> config.shouldLog = [DEFAULT, true]', () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.shouldLog).toBe(true);
    });
  });

  describe('config.logger: defines the logger method used for logging', () => {
    test('options.logger = function reference -> config.logger = function reference', () => {
      const logger = () => {};
      const options = { logger };
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(logger);
    });

    test('options.logger = undefined -> config.logger = [DEFAULT]', () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(defaultLogger);
    });

    test('options.logger = invalid type -> config.logger = [DEFAULT], emits console warning', () => {
      const options = { logger: 'a string' };
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(defaultLogger);
      expect(warnSpy).toBeCalled();
    });
  });

  describe('config.fallback: the fallback ApolloError constructor or ErrorMapItem used for unmapped Errors', () => {
    test('options.fallback = undefined -> config.fallback = [DEFAULT]', () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(defaultFallback);
    });

    test('options.fallback = valid ErrorMapItem -> config.fallback = ErrorMapItem', () => {
      const options = {
        fallback: {
          message: '',
          errorConstructor: ForbiddenError,
          logger: () => {},
        },
      };

      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(options.fallback);
    });

    test('options.fallback = ApolloError constructor -> config.fallback uses option constructor as fallback errorConstructor', () => {
      const expected = { ...defaultFallback, errorConstructor: ForbiddenError };
      const options = { fallback: ForbiddenError };
      const config = parseConfigOptions(options);
      expect(config.fallback).toEqual(expected);
    });

    test('options.fallback = invalid ErrorMapItem -> config.fallback = [DEFAULT], emits console warning', () => {
      const options = { fallback: { message: '' } };
      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(defaultFallback);
      expect(warnSpy).toBeCalled();
    });
  });

  describe('errorMap: the Error Map used for matching mapped Errors', () => {
    test('options.errorMap = undefined -> config.errorMap = {}', () => {
      const options = {};
      const config = parseConfigOptions(options);
      const isEmpyObject = Object.keys(config.errorMap).length === 0;
      expect(isEmpyObject).toBe(true);
    });

    test('options.errorMap = valid errorMaps -> config.errorMap = merged Error Maps', () => {
      const errorMap = {
        AMappedError: defaultFallback,
        SomeMappedError: { message: '', errorConstructor: ForbiddenError },
      };
      const options = { errorMap };
      const config = parseConfigOptions(options);
      expect(config.errorMap).toBe(errorMap);
    });

    test('options.errorMap contains invalid ErrorMapItem(s) -> config.errorMap = {}, throws Error', () => {
      const options = { errorMap: { anInvalidItem: { message: '' } } };
      try {
        parseConfigOptions(options);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
