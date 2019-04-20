function handleMappedError(error, mapping) {
  const { message, errorConstructor, data, logger } = mapping;

  // at minimum the message will be passed to the constructor
  const args = [message];

  // if logging is enabled
  if (this.shouldLog) {
    // boolean value indicates use of configured logger
    if (logger === true) {
      this.logger(error);
      // if it is a function a specific logger has been chosen
      // for this type of error, pass it the original error
    } else if (typeof logger === 'function') {
      logger(error);
    }
  }

  // if there is a value for the mapping
  // evaluate and push it into args
  if (data !== undefined) {
    args.push({ data: typeof data === 'function' ? data(error) : data });
  }

  // construct the mapped ApolloError passing it the arg(s)
  return new errorConstructor(...args);
}

function handleUnmappedError(error) {
  const { message, logger, errorConstructor } = this.fallback;

  // unmapped errors are logged by default unless logging is off
  if (this.shouldLog) {
    logger(error);
  }

  // return the fallback error and message
  return new errorConstructor(message);
}

module.exports = {
  handleMappedError,
  handleUnmappedError,
};
