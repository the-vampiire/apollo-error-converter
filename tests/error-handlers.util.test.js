const handlers = require('../lib/error-handlers');

const { mapItemBases } = require('../lib/map-items');
const { buildMapItemValue } = require('../lib/map-items');
const { defaultFallback } = require('../lib/constants');

const loggerSpy = jest
  // enable spying on default logger
  .spyOn(defaultFallback, 'logger')
  // suppress actual logging
  .mockImplementation(() => {});

const mappedError = new Error('original message');
mappedError.name = 'MappedError';

const mapItem = buildMapItemValue({
  logger: loggerSpy,
  baseItem: mapItemBases.InvalidFields,
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

describe('handleUnmappedError(): returns converted fallback ApolloError', () => {
  const error = new Error('a message');
  afterEach(() => loggerSpy.mockClear());

  test('options.logger is false: does not log', () => {
    const handleUnmappedError = handlers.handleUnmappedError.bind(
      loggingOffConfig,
    );

    const output = handleUnmappedError(error);
    expect(loggerSpy).not.toBeCalled();
    expect(output).toEqual(
      new defaultFallback.errorConstructor(defaultFallback.message),
    );
  });

  test('options.logger is set: logs original error', () => {
    const handleUnmappedError = handlers.handleUnmappedError.bind(
      defaultConfig,
    );

    const output = handleUnmappedError(error);
    expect(loggerSpy).toBeCalledWith(error);
    expect(output).toEqual(
      new defaultFallback.errorConstructor(defaultFallback.message),
    );
  });
});

describe('handleMappedError(): returns converted ApolloError with optional behavior', () => {
  const convertedErrorNoData = new mapItem.errorConstructor(mapItem.message);
  afterEach(() => loggerSpy.mockClear());

  test('options.logger is false, MapItem { message, errorConstructor }: does not log', () => {
    const output = handlers.handleMappedError.call(
      loggingOffConfig,
      mappedError,
      mapItem,
    );
    expect(loggerSpy).not.toBeCalled();
    expect(output).toEqual(convertedErrorNoData);
  });

  test('options.logger is false, MapItem { ..., logger: true }: does not log', () => {
    const output = handlers.handleMappedError.call(
      loggingOffConfig,
      mappedError,
      mapItem,
    );
    expect(loggerSpy).not.toBeCalled();
    expect(output).toEqual(convertedErrorNoData);
  });

  test('MapItem { ..., logger: true }: uses options.logger', () => {
    const loggerTrueMapItem = { ...mapItem, logger: true };

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      loggerTrueMapItem,
    );
    expect(loggerSpy).toBeCalledWith(mappedError);
    expect(output).toEqual(convertedErrorNoData);
  });

  test('MapItem { ..., logger: function }: uses MapItem logger', () => {
    const customLoggerMapitem = buildMapItemValue({
      baseItem: mapItem,
      logger: jest.fn(),
    });

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customLoggerMapitem,
    );
    expect(customLoggerMapitem.logger).toBeCalledWith(mappedError);
    expect(output).toEqual(convertedErrorNoData);
  });

  test('MapItem { ..., data: object }: adds data property to converted ApolloError', () => {
    const customDataMapitem = buildMapItemValue({
      baseItem: mapItem,
      data: { some: 'data' },
    });

    const { errorConstructor, message, data } = customDataMapitem;

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customDataMapitem,
    );
    expect(output).toEqual(new errorConstructor(message, data));
  });

  test('MapItem { ..., data: function }: adds data property of returned value to converted ApolloError', () => {
    const customDataMapitem = buildMapItemValue({
      baseItem: mapItem,
      data: jest.fn(() => ({ some: 'data' })),
    });

    const { errorConstructor, message } = customDataMapitem;

    const output = handlers.handleMappedError.call(
      defaultConfig,
      mappedError,
      customDataMapitem,
    );
    expect(output).toEqual(new errorConstructor(message, { some: 'data' }));
  });
});
