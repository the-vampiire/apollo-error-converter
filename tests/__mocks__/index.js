const { mapItemBases } = require('../../lib/map-items');
const { extendMapItem } = require('../../lib/map-items');

// dummy implementation
const shapeFieldErrors = error => ({ fields: {} });

const InvalidFields = extendMapItem(mapItemBases.InvalidFields, {
  data: shapeFieldErrors,
});

const UniqueConstraint = extendMapItem(mapItemBases.UniqueConstraint, {
  data: shapeFieldErrors,
  logger: true,
});

const errorMap1 = {
  ValidatorError: InvalidFields,
  ValidationError: UniqueConstraint,
};
const errorMap2 = {
  SequelizeValidationError: InvalidFields,
  SequelizeUniqueConstraintError: UniqueConstraint,
};

const errorMapsArray = [errorMap1, errorMap2];

const errorMap = {
  ...errorMap1,
  ...errorMap2,
};

module.exports = {
  errorMap,
  errorMapsArray,
};
