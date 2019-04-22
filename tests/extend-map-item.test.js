const {
  extendMapItem,
  mapItemBases: { InvalidFields },
} = require('../lib/map-items');

describe('extendMapItem(): core utility for extending MapItem objects', () => {
  test('extends the base with a new configuration', () => {
    const configuration = { data: () => {} };

    const output = extendMapItem(InvalidFields, configuration);
    expect(InvalidFields.data).not.toBeDefined(); // ensure no mutation
    expect(output.data).toBeDefined();
  });

  test('output configuration is an invalid MapItem: throws Error', () => {
    try {
      const output = extendMapItem(InvalidFields, { errorConstructor: Error });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
