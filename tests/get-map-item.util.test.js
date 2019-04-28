const getMapItem = require('../lib/get-map-item');

describe('getMapItem(): looks up a MapItem by the Error code or name property', () => {
  const errorCodeMapItem = 'mapping by Error.code';
  const errorNameMapItem = 'mapping by Error.name';
  const errorMapConfig = { errorMap: { ErrorCode: errorCodeMapItem, ErrorName: errorNameMapItem } };

  test('Error.code used for MapItem configuration: returns the MapItem', () => {
    const errorWithCode = new Error();
    errorWithCode.code = 'ErrorCode';

    const output = getMapItem.call(errorMapConfig, errorWithCode);
    expect(output).toBe(errorCodeMapItem);
  });

  test('Error.name used for MapItem configuration: returns the MapItem', () => {
    const errorWithName = new Error();
    errorWithName.name = 'ErrorName';

    const output = getMapItem.call(errorMapConfig, errorWithName);
    expect(output).toBe(errorNameMapItem);
  });

  test('No match for Error.name or Error.code: returns null', () => {
    const noMatchError = new Error();

    const output = getMapItem.call(errorMapConfig, noMatchError);
    expect(output).toBeNull();
  });
});