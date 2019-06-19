/**
 * Retrieves a MapItem for converting the Error
 * - the MapItem can be associated by error.[name, code, type]
 * @param {Error} originalError original Error object
 */
function getMapItem(originalError) {
  const { name, code, type } = originalError;
  return (
    this.errorMap[name] || this.errorMap[code] || this.errorMap[type] || null
  );
}

module.exports = getMapItem;
