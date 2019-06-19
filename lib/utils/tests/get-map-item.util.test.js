const getMapItem = require("../get-map-item");

describe("getMapItem(): looks up a MapItem by the original Error name, code or type property", () => {
  const errorNameMapItem = "mapping by Error.name";
  const errorCodeMapItem = "mapping by Error.code";
  const errorTypeMapItem = "mapping by Error.type";

  const errorMap = {
    errorMap: {
      ErrorName: errorNameMapItem,
      ErrorCode: errorCodeMapItem,
      ErrorType: errorTypeMapItem,
    },
  };

  test("Error.name used for MapItem configuration: returns the MapItem", () => {
    const errorWithName = new Error();
    errorWithName.name = "ErrorName";

    const output = getMapItem.call(errorMap, errorWithName);
    expect(output).toBe(errorNameMapItem);
  });

  test("Error.code used for MapItem configuration: returns the MapItem", () => {
    const errorWithCode = new Error();
    errorWithCode.code = "ErrorCode";

    const output = getMapItem.call(errorMap, errorWithCode);
    expect(output).toBe(errorCodeMapItem);
  });

  test("Error.type used for MapItem configuration: returns the MapItem", () => {
    const errorWithType = new Error();
    errorWithType.type = "ErrorType";

    const output = getMapItem.call(errorMap, errorWithType);
    expect(output).toBe(errorTypeMapItem);
  });

  test("No mapping found by error.[name, code, type]: returns null", () => {
    const noMatchError = new Error();

    const output = getMapItem.call(errorMap, noMatchError);
    expect(output).toBeNull();
  });
});
