const { ApolloError } = require("apollo-server-core");
const ApolloErrorConverter = require("../apollo-error-converter");

const { handleMappedError, handleUnmappedError } = require("../../utils");

jest.mock("../../utils/error-handlers.js");

const testDebugAndGraphQLSyntaxBehavior = (options = {}) => {
  test("debug mode enabled: passes all received Errors through", () => {
    const formatError = new ApolloErrorConverter(options, true);
    const errors = [new Error(), new ApolloError()];

    const outputs = errors.map(error => formatError(error));
    expect(outputs).toEqual(errors);
  });

  test("GraphQL syntax error received: passes the Error through", () => {
    const graphQLError = { originalError: {} }; // original Error will be an empty object
    const formatError = new ApolloErrorConverter(options);
    expect(formatError(graphQLError)).toBe(graphQLError);
  });
};

describe("Apollo Error Converter: core export", () => {
  describe("default behavior (empty options)", () => {
    const formatError = new ApolloErrorConverter();

    testDebugAndGraphQLSyntaxBehavior();

    test("original Error is an ApolloError instance: passes the Error through", () => {
      const graphQLError = { originalError: new ApolloError() };

      const output = formatError(graphQLError);
      expect(output).toBe(graphQLError);
    });

    test("original Error is a non-Apollo Error: processes and converts as an unmapped Error", () => {
      const error = new Error();
      const graphQLError = { originalError: error };

      formatError(graphQLError);
      expect(handleUnmappedError).toHaveBeenCalledWith(graphQLError);
    });
  });

  describe("behavior with options.errorMap defined", () => {
    const mappedError = new Error("an error");
    mappedError.name = "MappedError";

    const errorMap = {
      [mappedError.name]: {
        message: "mapped message",
        logger: true,
      },
      MapppedException: {
        message: "Mappped Exception"
      }
    };

    const options = { errorMap };
    const formatError = new ApolloErrorConverter(options);

    testDebugAndGraphQLSyntaxBehavior(options);

    test("original Error is an ApolloError instance: passes the Error through", () => {
      const graphQLError = { originalError: new ApolloError() };

      const output = formatError(graphQLError);
      expect(output).toBe(graphQLError);
    });

    test("original Error has no mapping in the ErrorMap: processes and converts the unmapped Error", () => {
      const error = new Error();
      const graphQLError = { originalError: error };

      formatError(graphQLError);
      expect(handleUnmappedError).toHaveBeenCalledWith(graphQLError);
    });

    test("original Error has a mapping in the ErrorMap: processes and converts the mapped Error", () => {
      const graphQLError = { originalError: mappedError };

      formatError(graphQLError);
      expect(handleMappedError).toHaveBeenCalledWith(
        graphQLError,
        errorMap[mappedError.name],
      );
    });

    describe("find mapped error by class name", () => {
      const runTest = originalError => {
        const graphQLError = { originalError };
        formatError(graphQLError);
        expect(handleMappedError).toHaveBeenCalledWith(
          graphQLError,
          errorMap.MapppedException
        );
      };

      test("class", () => {
        class MapppedException extends Error {}
        runTest(new MapppedException());
      });

      test("function", () => {
        function MapppedException() {}
        runTest(new MapppedException());
      });
    });
  });
});
