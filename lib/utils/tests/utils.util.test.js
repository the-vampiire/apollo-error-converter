const { ApolloError } = require("apollo-server-core");

const {
  defaultFallback,
  mapItemShape: { requiredKeys, optionalKeys },
} = require("../../core/constants");

const {
  isOneOfTypes,
  isMapItemValid,
  mergeErrorMaps,
  fallbackIsValid,
  validateErrorMap,
  validateRequiredMapItemFields,
  validateOptionalMapItemFields,
} = require("../utils");

// tests will break if either of these shapes change - forces consistent tests
const { errorMap, errorMapsArray } = require("./__mocks__");

describe("Error Map utilities", () => {
  // will break if mapItemShape changes - forces consistent tests
  describe("validateErrorMap: Validates every Map Item entry in a merged Error Map", () => {
    test("valid merged Error Map: returns valid Error Map", () => {
      const result = validateErrorMap(errorMap, requiredKeys, optionalKeys);
      expect(result).toEqual(errorMap);
    });

    test("invalid merged Error Map: throws Invalid Map Item error with item key and value", () => {
      const invalidMap = {
        ...errorMap,
        BadKey: {
          message: "a message",
          logger: 123,
          data: () => {},
        },
      };

      expect(() => validateErrorMap(invalidMap, requiredKeys, optionalKeys)).toThrow();
    });
  });

  describe("isMapItemValid: Validates an individual entry in the merged Error Map", () => {
    const mapItemBase = { message: "a message", errorConstructor: ApolloError };

    test("only required fields with correct shapes: returns true", () => {
      const result = isMapItemValid(mapItemBase, requiredKeys, optionalKeys);
      expect(result).toBe(true);
    });

    test("required and optional fields with correct shapes: returns true", () => {
      const mapItem = { ...mapItemBase, logger: true, data: () => {} };

      const result = isMapItemValid(mapItem, requiredKeys, optionalKeys);
      expect(result).toBe(true);
    });

    test("missing required: returns false", () => {
      const mapItem = { logger: () => {} }; // missing message
      expect(isMapItemValid(mapItem, requiredKeys, optionalKeys)).toBe(false);
    });

    test("invalid shapes: returns false", () => {
      const mapItem = {
        message: 1234,
        logger: true,
      };
      expect(isMapItemValid(mapItem, requiredKeys, optionalKeys)).toBe(false);
    });
  });

  describe("mergeErrorMaps: Consumes and merges ErrorMap Object(s)", () => {
    test("given an Array of ErrorMap elements: returns merged ErrorMap", () => {
      const expectedKeys = Object.keys(errorMap);

      const result = mergeErrorMaps(errorMapsArray);
      expect(Object.keys(result)).toEqual(expectedKeys);
    });

    test("given a single pre-merged Errormap: returns the ErrorMap", () => {
      const result = mergeErrorMaps(errorMap);
      expect(result).toBe(errorMap);
    });
  });

  describe("fallbackIsValid: Ensures the fallback is a valid MapItem configuration", () => {
    test("fallback is undefined: returns false", () => {
      expect(fallbackIsValid()).toBe(false);
    });

    test("fallback is a valid MapItem: returns true", () => {
      expect(fallbackIsValid(defaultFallback)).toBe(true);
    });

    test("fallback is an invalid MapItem: returns false", () => {
      // missing message
      expect(fallbackIsValid({ logger: () => {} })).toBe(false);
    });
  });

  describe("validateRequiredMapItemFields: Validates the required Map Item fields presence and shape", () => {
    // arbitrary
    const required = [
      { key: "errorConstructor", types: ["function"] },
      { key: "someKey", types: ["string", "function", "object"] },
      { key: "someOther", types: ["array", "function", "object"] },
    ];

    test("has fields and correct shape: returns true", () => {
      const mapItem = {
        errorConstructor: ApolloError,
        someKey: () => {},
        someOther: [],
      };

      const result = validateRequiredMapItemFields(mapItem, required);
      expect(result).toBe(true);
    });

    test("has fields with incorrect shape: returns false", () => {
      const mapItem = {
        errorConstructor: ApolloError,
        someKey: 5,
        someOther: [],
      };

      const result = validateRequiredMapItemFields(mapItem, required);
      expect(result).toBe(false);
    });

    test("missing a required field: returns false", () => {
      const mapItem = { errorConstructor: ApolloError };

      const result = validateRequiredMapItemFields(mapItem, required);
      expect(result).toBe(false);
    });
  });

  describe("validateOptionalMapItemFields: Validates the optional Map Item field shapes", () => {
    // arbitrary
    const optional = [
      { key: "aKey", types: ["function", "object", "boolean"] },
      { key: "someStuff", types: ["number", "string", "object"] },
    ];

    test("no optional fields: returns true", () => {
      const mapItem = { requiredField: "correct" };

      const result = validateOptionalMapItemFields(mapItem, optional);
      expect(result).toBe(true);
    });

    test("optional field missing + others have valid shape: returns true", () => {
      const mapItem = { requiredField: "correct", someStuff: {} };

      const result = validateOptionalMapItemFields(mapItem, optional);
      expect(result).toBe(true);
    });

    test("all optional fields and shapes correct: returns true", () => {
      // expected shape as of v0.0.1
      const optionalFields = [
        { key: "logger", types: ["function", "boolean"] },
        { key: "data", types: ["function", "object"] },
      ];
      const mapItem = {
        requiredField: "correct",
        logger: () => {},
        data: () => {},
      };

      const result = validateOptionalMapItemFields(mapItem, optionalFields);
      expect(result).toBe(true);
    });

    test("optional field has invalid shape: returns false", () => {
      const mapItem = { requiredField: "correct", aKey: [] };

      const result = validateOptionalMapItemFields(mapItem, optional);
      expect(result).toBe(false);
    });
  });

  describe("isOneOfTypes: Checks if the value is one of the list of type strings", () => {
    describe("of supported types: [string, number, function, boolean, array, object]", () => {
      const ofTypes = [
        "string",
        "number",
        "function",
        "boolean",
        "array",
        "object",
      ];

      const tests = {
        string: "a string",
        number: 2.1,
        function: () => {},
        boolean: true,
        array: [],
        object: {},
      };

      Object.entries(tests).forEach(([type, value]) => test(`type: ${type}`, () => expect(isOneOfTypes(value, ofTypes)).toBe(true)));
    });
  });
});
