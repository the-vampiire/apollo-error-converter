const handlers = require("../error-handlers");
const createApolloError = require("../create-apollo-error");

const { mapItemBases } = require("../../core/map-items");
const { extendMapItem } = require("../../core/map-items");
const { defaultFallback } = require("../../core/constants");

jest.mock("../create-apollo-error.js");

const optionsLogger = jest
  // enable spying on default logger
  .spyOn(defaultFallback, "logger")
  // suppress actual logging
  .mockImplementation(() => {});

const defaultConfig = {
  shouldLog: true,
  logger: optionsLogger,
  fallback: defaultFallback,
};

describe("handleUnmappedError", () => {
  const loggingOffConfig = {
    shouldLog: false,
    fallback: defaultFallback,
  };
  const error = new Error("a message");
  const graphqlError = { originalError: error };

  afterEach(() => jest.clearAllMocks());

  test("returns ApolloError converted with fallback MapItem configuration", () => {
    handlers.handleUnmappedError.call(defaultConfig, graphqlError);

    expect(createApolloError).toHaveBeenCalledWith(
      graphqlError,
      defaultConfig.fallback,
    );
  });

  test("AEC options.logger is false: does not log", () => {
    handlers.handleUnmappedError.call(loggingOffConfig, graphqlError);

    expect(optionsLogger).not.toHaveBeenCalled();
  });

  test("AEC options.logger is configured: logs the original error", () => {
    handlers.handleUnmappedError.call(defaultConfig, graphqlError);

    expect(optionsLogger).toHaveBeenCalledWith(graphqlError.originalError);
  });
});

describe("handleMappedError", () => {
  const mappedError = new Error("original message");
  const graphqlError = { originalError: mappedError };
  const customLogger = jest.fn();
  const mapItem = extendMapItem(mapItemBases.InvalidFields, {
    logger: customLogger,
  });

  afterEach(() => jest.clearAllMocks());

  test("returns ApolloError converted with mapped MapItem configuration", () => {
    handlers.handleMappedError.call(defaultConfig, graphqlError, mapItem);
    expect(createApolloError).toHaveBeenCalledWith(graphqlError, mapItem);
  });

  test("mapItem.logger is false: does not log", () => {
    handlers.handleMappedError.call(defaultConfig, graphqlError, {
      ...mapItem,
      logger: false,
    });
    expect(optionsLogger).not.toHaveBeenCalled();
    expect(customLogger).not.toHaveBeenCalled();
  });

  test("mapItem.logger is undefined: does not log", () => {
    handlers.handleMappedError.call(defaultConfig, graphqlError, {
      ...mapItem,
      logger: false,
    });
    expect(optionsLogger).not.toHaveBeenCalled();
    expect(customLogger).not.toHaveBeenCalled();
  });

  test("mapItem.logger is true: uses AEC options.logger to log original Error", () => {
    handlers.handleMappedError.call(defaultConfig, graphqlError, {
      ...mapItem,
      logger: true,
    });
    expect(optionsLogger).toHaveBeenCalledWith(graphqlError.originalError);
  });

  test("mapItem.logger is a function: uses MapItem logger to log original Error", () => {
    handlers.handleMappedError.call(defaultConfig, graphqlError, mapItem);
    expect(customLogger).toHaveBeenCalledWith(graphqlError.originalError);
  });
});
