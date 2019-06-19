/* eslint no-console: 0 */
const defaultLogger = console.error;

const defaultFallback = {
  logger: defaultLogger,
  code: "INTERNAL_SERVER_ERROR",
  message: "Internal Server Error",
};

const requiredKeys = [{ key: "message", types: ["string"] }];

const optionalKeys = [
  { key: "code", types: ["string"] },
  { key: "data", types: ["function", "object"] },
  { key: "logger", types: ["function", "boolean"] },
];

module.exports = {
  defaultLogger,
  defaultFallback,
  mapItemShape: {
    requiredKeys,
    optionalKeys,
  },
};
