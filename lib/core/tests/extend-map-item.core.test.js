const {
  extendMapItem,
  mapItemBases: { InvalidFields },
} = require("../map-items");

describe("extendMapItem(): core utility for extending MapItem objects", () => {
  test("returns a new MapItem extended from the base MapItem with new configuration", () => {
    const configuration = { data: () => {} };

    const output = extendMapItem(InvalidFields, configuration);
    expect(InvalidFields.data).not.toBeDefined(); // ensure no mutation of original MapItem
    expect(output.data).toBeDefined();
  });

  test("output configuration is an invalid MapItem: throws Error", () => {
    try {
      extendMapItem(InvalidFields, { errorConstructor: Error });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
