const shouldErrorPassThrough = require("../should-error-pass-through");

describe("shouldErrorPassThrough: controls whether an Error should be passed through before being processed by AEC", () => {
  test("debug mode enabled: returns true", () => expect(shouldErrorPassThrough(true)).toBe(true));

  test("original Error is an ApolloError or subclass with an 'extensions' property: returns true", () => {
    const originalError = { extensions: { stuff: "in here" } };
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
