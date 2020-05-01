const { defaultFallback } = require("../../core/constants");
const createApolloError = require("../create-apollo-error");

const path = ["a", "path"];
const locations = [{ line: 1, column: 1 }];
const originalError = {
  stack: [],
  message: "something has goofed tremendously",
};

const graphQLError = {
  path,
  locations,
  originalError,
};

const mapItem = {
  code: "TREMENDOUS_GOOFERY",
  data: { some: "extra data" },
  message: "those responsible for the sacking have been sacked",
};

describe("createApolloError: converts the original error to an Apollo Error", () => {
  let result;
  beforeAll(() => {
    result = createApolloError(graphQLError, mapItem);
  });

  test("converted error includes the GraphQL path and location", () => {
    ["path", "location"].forEach(property =>
      expect(result[property]).toBe(graphQLError[property]),
    );
  });

  test("converted error has a top level message property from the mapItem", () =>
    expect(result.message).toBe(mapItem.message));

  test("converted error includes extensions object, { code, data }, from the mapItem", () => {
    expect(result.extensions).toBeDefined();
    expect(result.extensions.data).toBe(mapItem.data);
    expect(result.extensions.code).toBe(mapItem.code);
  });

  test(`mapItem.code is not provided: uses default fallback code [${defaultFallback.code}]`, () => {
    const noCodeResult = createApolloError(graphQLError, {
      message: "no code",
    });
    expect(noCodeResult.extensions.code).toBe(defaultFallback.code);
  });

  describe("variants on mapItem.data", () => {
    test("data is undefined: extensions.data is an empty object", () => {
      const { message, code } = mapItem;

      const noDataResult = createApolloError(graphQLError, { message, code });
      expect(noDataResult.extensions.data).toBeDefined();
      expect(Object.keys(noDataResult.extensions.data).length).toBe(0);
    });

    test("data is a function: extensions.data is the result of executing the function providing it the original error", () => {
      const expectedData = "some function output";
      const dataFunction = jest.fn(() => expectedData);

      const dataFunctionResult = createApolloError(graphQLError, {
        ...mapItem,
        data: dataFunction,
      });
      expect(dataFunction).toHaveBeenCalledWith(graphQLError.originalError);
      expect(dataFunctionResult.extensions.data).toBe(expectedData);
    });
  });
});
