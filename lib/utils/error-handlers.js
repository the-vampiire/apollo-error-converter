const createApolloError = require("./create-apollo-error");

function handleMappedError(graphqlError, mapItem) {
  const { logger } = mapItem;
  const { originalError } = graphqlError;

  // logger may be [undefined, true, false, function]
  if (logger) {
    // if it is a function a specific logger has been chosen for this MapItem, otherwise use AEC configured logger
    const errorLogger = typeof logger === "function" ? logger : this.logger;

    errorLogger(originalError);
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
