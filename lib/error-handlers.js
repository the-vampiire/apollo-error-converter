 const { parseConstructorArguments } = require('./utils');

function handleMappedError(error, mapping) {
  const { logger, errorConstructor } = mapping;
  const constructorArguments = parseConstructorArguments(error, mapping);

  // if logging is configured and enabled for this mapping
  if (this.shouldLog && logger) {
    // if it is a function a specific logger has been chosen for this mapping
    if (typeof logger === 'function') {
      logger(error);
    } else {
      // otherwise logger = true, use configured logger
      this.logger(error);
    }
  }
  
  // construct the mapped ApolloError passing it the arg(s)
  return new errorConstructor(...constructorArguments);
}

function handleUnmappedError(error) {
  const constructorArguments = parseConstructorArguments(error, this.fallback);

  // unmapped errors are logged by default unless logging is off
  if (this.shouldLog) {
    this.logger(error);
  }

  // return the fallback error and message
  return new this.fallback.errorConstructor(...constructorArguments);
}

module.exports = {
  handleMappedError,
  handleUnmappedError,
};
