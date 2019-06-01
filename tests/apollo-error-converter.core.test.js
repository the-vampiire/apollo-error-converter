const { ApolloErrorConverter } = require("../lib");
const { ApolloError } = require("apollo-server-core");

const {
  handleMappedError,
  handleUnmappedError,
} = require("../lib/error-handlers");
jest.mock("../lib/error-handlers.js");

describe("Apollo Error Converter: core export", () => {
  test("debug = true: passes all GraphQLErrors through", () => {
    const formatError = new ApolloErrorConverter({}, true);
    const errors = [new Error(), new ApolloError()];

    const outputs = errors.map(error => formatError(error));
    expect(outputs).toEqual(errors);
  });

  describe("default behavior (empty options)", () => {
    const formatError = new ApolloErrorConverter();

    test("given an ApolloError: returns the GraphQLError", () => {
      const error = { originalError: new ApolloError() };

      const output = formatError(error);
      expect(output).toBe(error);
    });

    test("given a non-Apollo Error: calls handleUnmappedError() utility with the Error", () => {
      const error = new Error();

      formatError({ originalError: error });
      expect(handleUnmappedError).toBeCalledWith(error);
    });
  });

  describe("behavior with an Error Map passed", () => {
    const errorMap = {
      MappedError: {
        errorConstructor: ApolloError,
        message: "mapped message",
        logger: true,
      },
    };
    const formatError = new ApolloErrorConverter({ errorMap });

    test("given an ApolloError: returns the GraphQLError", () => {
      const graphqlError = { originalError: new ApolloError() };

      const output = formatError(graphqlError);
      expect(output).toBe(graphqlError);
    });

    test("given UnMapped Error: calls handleUnmappedError() utility with the Error", () => {
      const error = new Error();

      formatError({ originalError: new Error() });
      expect(handleUnmappedError).toBeCalledWith(error);
    });

    test("given a Mapped Error: calls handleMappedError() utility with the Error and mapping", () => {
      const mappedError = new Error("an error");
      mappedError.name = "MappedError";

      formatError({ originalError: mappedError });
      expect(handleMappedError).toBeCalledWith(
        mappedError,
        errorMap[mappedError.name],
      );
    });
  });
});
