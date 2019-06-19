const handlers = require("../error-handlers");
const createApolloError = require("../create-apollo-error");

const { mapItemBases } = require("../../core/map-items");
const { extendMapItem } = require("../../core/map-items");
const { defaultFallback } = require("../../core/constants");

jest.mock("../create-apollo-error.js");

const loggerSpy = jest
  // enable spying on default logger
  .spyOn(defaultFallback, "logger")
  // suppress actual logging
  .mockImplementation(() => {});

const mappedError = new Error("original message");
mappedError.name = "MappedError";

const mapItem = extendMapItem(mapItemBases.InvalidFields, {
  logger: loggerSpy,
});

const loggingOffConfig = {
  shouldLog: false,
  fallback: defaultFallback,
};

const defaultConfig = {
  shouldLog: true,
  logger: loggerSpy,
  fallback: defaultFallback,
};

describe("handleUnmappedError", () => {
  const error = new Error("a message");
  const graphqlError = { originalError: error };

  afterEach(() => jest.clearAllMocks());

  test("returns ApolloError converted with fallback MapItem configuration", () => {
    const handleUnmappedError = handlers.handleUnmappedError.bind(
      defaultConfig,
    );
    handleUnmappedError(graphqlError);
    expect(createApolloError).toHaveBeenCalledWith(
      graphqlError,
      defaultConfig.fallback,
    );
  });

  test("AEC options.logger is false: does not log", () => {
    const handleUnmappedError = handlers.handleUnmappedError.bind(
      loggingOffConfig,
    );

    handleUnmappedError(graphqlError);
    expect(loggerSpy).not.toHaveBeenCalled();
  });

  test("AEC options.logger is configured: logs the original error", () => {
    const handleUnmappedError = handlers.handleUnmappedError.bind(
      defaultConfig,
    );

    handleUnmappedError(graphqlError);
    expect(loggerSpy).toHaveBeenCalledWith(graphqlError.originalError);
  });
});

// TODO: refactor tests
describe("handleMappedError(): returns converted ApolloError with optional behavior", () => {
  const convertedErrorNoData = new mapItem.errorConstructor(mapItem.message);
  afterEach(() => loggerSpy.mockClear());

  test("options.logger is false, MapItem { message, errorConstructor }: does not log", () => {
    const output = handlers.handleMappedError.call(
      loggingOffConfig,
      mappedError,
      mapItem,
    );
    expect(loggerSpy).not.toHaveBeenCalled();
    expect(output).toEqual(convertedErrorNoData);
  });

  test("options.logger is false, MapItem { ..., logger: true }: does not log", () => {
    const output = handlers.handleMappedError.call(
      loggingOffConfig,
      mappedError,
      mapItem,
    );
    expect(loggerSpy).not.toHaveBeenCalled();
    expect(output).toEqual(convertedErrorNoData);
  });

  test("MapItem { ..., logger: true }: uses options.logger", () => {
    const loggerTrueMapItem = { ...mapItem, logger: true };

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      loggerTrueMapItem,
    );
    expect(loggerSpy).toHaveBeenCalledWith(mappedError);
    expect(output).toEqual(convertedErrorNoData);
  });

  test("MapItem { ..., logger: function }: uses MapItem logger", () => {
    const customLoggerMapitem = extendMapItem(mapItem, { logger: jest.fn() });

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customLoggerMapitem,
    );
    expect(customLoggerMapitem.logger).toHaveBeenCalledWith(mappedError);
    expect(output).toEqual(convertedErrorNoData);
  });

  test("MapItem { ..., data: object }: adds data property to converted ApolloError", () => {
    const customDataMapitem = extendMapItem(mapItem, {
      data: { some: "data" },
    });

    const { errorConstructor, message, data } = customDataMapitem;

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customDataMapitem,
    );
    expect(output).toEqual(new errorConstructor(message, data));
  });

  test("MapItem { ..., data: function }: adds data property of returned value to converted ApolloError", () => {
    const customDataMapitem = extendMapItem(mapItem, {
      data: jest.fn(() => ({ some: "data" })),
    });

    const { errorConstructor, message } = customDataMapitem;

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customDataMapitem,
    );
    expect(output).toEqual(new errorConstructor(message, { some: "data" }));
  });
});
