const { isMapItemValid } = require("../utils/utils");
const { requiredKeys, optionalKeys } = require("./constants").mapItemShape;

/**
 * Extends a MapItem with different and / or additional properties
 *
 * @throws {Error} "Invalid MapItem configuration" if the resulting configuration is invalid
 * @param {MapItem} baseItem the base Mapitem to extend
 * @param {{ message?: string, code?: string, logger?: boolean | function, data?: {} | function  }} configuration
 */
const extendMapItem = (baseItem, configuration) => {
  const mapItem = { ...baseItem, ...configuration };

  if (!isMapItemValid(mapItem, requiredKeys, optionalKeys)) {
    throw new Error("Invalid MapItem configuration");
  }

  return mapItem;
};

const InvalidFields = {
  code: "INVALID_FIELDS",
  message: "Invalid Field Values",
};

const UniqueConstraint = {
  code: "UNIQUE_CONSTRAINT",
  message: "Unique Constraint Violation",
};

module.exports = {
  extendMapItem,
  mapItemBases: {
    InvalidFields,
    UniqueConstraint,
  },
};
