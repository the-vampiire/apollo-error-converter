const createApolloError = require("./create-apollo-error");

function handleMappedError(graphQLError, mapItem) {
  const { logger } = mapItem;
  const { originalError } = graphQLError;

  // logger may be [undefined, true, false, function]
  if (logger) {
    // if it is a function a specific logger has been chosen for this MapItem, otherwise use AEC configured logger
    const errorLogger = typeof logger === "function" ? logger : this.logger;

    errorLogger(originalError);
  }

  return createApolloError(graphQLError, mapItem);
}

function handleUnmappedError(graphQLError) {
  const { originalError } = graphQLError;

  if (this.shouldLog) {
    this.logger(originalError);
  }

  return createApolloError(graphQLError, this.fallback);
}

module.exports = {
  handleMappedError,
  handleUnmappedError,
};
