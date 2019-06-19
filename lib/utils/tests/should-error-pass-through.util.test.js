const { ApolloError, UserInputError } = require("apollo-server-core");
const shouldErrorPassThrough = require("../should-error-pass-through");

describe("shouldErrorPassThrough: controls whether an Error should be passed through before being processed by AEC", () => {
  test("debug mode enabled: returns true", () => expect(shouldErrorPassThrough(true)).toBe(true));

  test("original Error is an ApolloError (custom handling from resolver): returns true", () => {
    const originalError = new ApolloError();
    expect(shouldErrorPassThrough(false, originalError)).toBe(true);
  });

  test("original Error is an ApolloError subclass: returns true", () => {
    const originalError = new UserInputError();
    expect(shouldErrorPassThrough(false, originalError)).toBe(true);
  });

  test("GraphQL syntax error (original Error is an empty object): returns true", () => {
    const originalError = {};
    expect(shouldErrorPassThrough(false, originalError)).toBe(true);
  });

  test("(debug off) originalError should be processed by AEC: returns false", () => {
    const originalError = new Error();
    expect(shouldErrorPassThrough(false, originalError)).toBe(false);
  });
});
