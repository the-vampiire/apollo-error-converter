const createApolloError = require("./create-apollo-error");

function handleMappedError(graphqlError, mapItem) {
  const { logger } = mapItem;
  const { originalError } = graphqlError;

  // if logging is enabled and configured for this MapItem
  if (this.shouldLog && logger) {
    // if it is a function a specific logger has been chosen for this MapItem
    if (typeof logger === "function") {
      logger(originalError);
    } else {
      // otherwise logger = true, use configured logger
      this.logger(originalError);
    }
  }

  return createApolloError(graphqlError, mapItem);
}

function handleUnmappedError(graphqlError) {
  const { originalError } = graphqlError;

  if (this.shouldLog) {
    this.logger(originalError);
  }

  return createApolloError(graphqlError, this.fallback);
}

module.exports = {
  handleMappedError,
  handleUnmappedError,
};
