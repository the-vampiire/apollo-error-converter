const parseConfigOptions = require("../parse-config-options");
const { defaultFallback, defaultLogger } = require("../../core/constants");

describe("parseConfigOptions: Parses configuration options for ApolloErrorConverter construction", () => {
  beforeAll(() => {
    global.console.warn = jest.fn();
  });
  afterEach(() => jest.clearAllMocks());

  describe("config.shouldLog: controls whether logging should occur when converting unmapped Errors", () => {
    test("options.logger is false: config.shouldLog is false", () => {
      const options = { logger: false };
      const config = parseConfigOptions(options);
      expect(config.shouldLog).toBe(false);
    });

    test("options.logger is undefined: config.shouldLog is true [DEFAULT]", () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.shouldLog).toBe(true);
    });
  });

  describe("config.logger: defines the default logger function used for logging", () => {
    test("options.logger is a function reference: config.logger is the function reference", () => {
      const logger = () => {};
      const options = { logger };
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(logger);
    });

    test("options.logger is undefined: config.logger is the [DEFAULT LOGGER]", () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(defaultLogger);
    });

    test("options.logger is invalid: config.logger is the [DEFAULT LOGGER], emits console warning", () => {
      const options = { logger: "a string" };
      const config = parseConfigOptions(options);
      expect(config.logger).toBe(defaultLogger);
      expect(global.console.warn).toHaveBeenCalled();
    });
  });

  describe("config.fallback: the fallback MapItem used for converting unmapped Errors", () => {
    test("options.fallback is undefined: config.fallback is the [DEFAULT FALLBACK]", () => {
      const options = {};
      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(defaultFallback);
    });

    test("options.fallback is a valid MapItem: config.fallback is the MapItem", () => {
      const options = {
        fallback: {
          message: "",
          logger: () => {},
        },
      };

      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(options.fallback);
    });

    test("options.fallback is an invalid MapItem: config.fallback is [DEFAULT FALLBACK], emits console warning", () => {
      const options = { fallback: { nonsense: "" } };
      const config = parseConfigOptions(options);
      expect(config.fallback).toBe(defaultFallback);
      expect(global.console.warn).toHaveBeenCalled();
    });
  });

  describe("config.errorMap: the ErrorMap used for mapping Errors to MapItems", () => {
    const errorMap = {
      AMappedError: defaultFallback,
      SomeMappedError: { message: "", data: { extra: "error data" } },
    };

    test("options.errorMap is undefined: config.errorMap is {}", () => {
      const options = {};
      const config = parseConfigOptions(options);
      const isEmpyObject = Object.keys(config.errorMap).length === 0;
      expect(isEmpyObject).toBe(true);
    });

    test("options.errorMap is a valid ErrorMap: config.errorMap is the ErrorMap", () => {
      const options = { errorMap };
      const config = parseConfigOptions(options);
      expect(config.errorMap).toBe(errorMap);
    });

    test("options.errorMap is an Array of ErrorMap objects: config.errorMap is the merged ErrorMap ", () => {
      const otherErrorMap = { OtherMappedError: { message: "another one" } };
      const errorMapArray = [errorMap, otherErrorMap];

      const expectedMappings = [
        ...Object.keys(errorMap),
        ...Object.keys(otherErrorMap),
      ];

      const options = { errorMap: errorMapArray };
      const config = parseConfigOptions(options);
      expectedMappings.forEach(mapping => expect(config.errorMap[mapping]).toBeDefined());
    });

    test("options.errorMap contains invalid MapItem(s): throws Error", () => {
      const options = { errorMap: { anInvalidItem: { nonsense: "" } } };
      try {
        parseConfigOptions(options);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
