# Apollo Error Converter

[![Build Status](https://travis-ci.org/the-vampiire/apollo-error-converter.svg?branch=master)](https://travis-ci.org/the-vampiire/apollo-error-converter) [![Coverage Status](https://coveralls.io/repos/github/the-vampiire/apollo-error-converter/badge.svg?branch=master)](https://coveralls.io/github/the-vampiire/apollo-error-converter?branch=master) [![NPM Package](https://img.shields.io/npm/v/apollo-error-converter.svg?label=NPM:%20apollo-error-converter)](https://npmjs.org/apollo-error-converter)

A utility for greatly simplifying GraphQL Apollo Server Error handling without sacrificing core principles:

1. Hide implementation details exposed from Errors thrown by resolvers and their underlying calls
2. Provide logging of thrown Errors for internal administrative use and records
3. Provide clean and useful Errors to the clients consuming the API

If you want to read more about the background and motivation for this package check out the [BACKGROUND.md](./BACKGROUND.md) file.

# How it works

Stop writing `try/catch` or rethrowing `ApolloErrors` throughout your Apollo Server API. Let the Errors flow! Apollo Error Converter will catch, log and convert all of your resolver-thrown Errors for you. All converted Errors adhere to the core principles you expect from a well designed API. AEC can be used with any `apollo-server-x` flavor.

Using the [default configuration](#Default-Configuration) will provide you with a secure API in seconds. If you choose to customize AEC your ErrorMap and MapItems are not only simple to configure but portable and reusable across all of your GraphQL API projects!

AEC categorizes the Errors it processes as either `mapped` or `unmapped`. Mapped Errors use an [ErrorMap](#ErrorMap) and [MapItems](#MapItem) to define how they should be logged and converted. Unmapped Errors use a fallback MapItem for processing. Any `ApolloError` you manually throw from a resolver will be passed through.

The converted Errors all respect the [GraphQL spec](https://graphql.github.io/graphql-spec/draft/#sec-Errors) and will have the following shape:

```js
{
  "errors": [
    {
      "path": ["failure", "path"],
      "locations": [{ "line": #, "column": # }],
      "message": "your custom message",
      "extensions": {
        "data": {
          // custom data to include
        },
        "code": "YOUR_CUSTOM_CODE"
      }
    }
  ],
}
```

# Usage

Install using [npm](https://npmjs.org/apollo-error-converter):

```sh
npm i apollo-error-converter
```

Create an instance of `ApolloErrorConverter` and assign it to the `formatError` option of the `ApolloServer` constructor.

```js
const {
  ApolloErrorConverter, // required: core export
  mapItemBases, // optional: MapItem bases of common Errors that can be extended
  extendMapItem, // optional: tool for extending MapItems with new configurations
} = require("apollo-error-converter");

// assign it to the formatError option in ApolloError constructor
new ApolloServer({
  formatError: new ApolloErrorConverter(), // default
  formatError: new ApolloErrorConverter({ logger, fallback, errorMap }), // customize with options
});
```

# Configuration & Behavior

## Default Configuration

```js
const { ApolloErrorConverter } = require("apollo-error-converter");

// assign it to the formatError option
const server = new ApolloServer({
  formatError: new ApolloErrorConverter(),
});
```

Behaviors for Errors handled by AEC`:

- unmapped Errors
  - logged by default `logger`
    - `console.error`
  - converted to an `ApolloError` using the default `fallback` MapItem
    - `message`: `"Internal Server Error"`
    - `code`: `"INTERNAL_SERVER_ERROR"`
    - `data`: `{}`
- mapped Errors
  - all Errors are considered unmapped in this configuration since there is no [ErrorMap](#ErrorMap) defined
- `ApolloError` (or subclass) Errors
  - manually thrown from a resolver
  - no logging
  - passed through directly to the API consumer

## Custom Configuration

For custom configurations take a look at the [Options](#Options) section below.

```js
const { ApolloErrorConverter } = require("apollo-error-converter");

// assign it to the formatError option
new ApolloServer({
  formatError: new ApolloErrorConverter({ logger, fallback, errorMap }),
});
```

Behaviors for Errors handled by AEC:

- unmapped Errors
  - logged using
    - `options.logger`
    - no logger defined: the default logger (see [Options](#Options))
  - processed and converted using
    - `options.fallback`
    - no fallback: the default fallback (see [Options](#Options))
- mapped Errors
  - behavior dependent on [MapItem](#MapItem) configuration for the mapped Error
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through

# Customization

AEC can have its behavior customized through the [`options` object](#Options) in its constructor. In addition there are two other exports [extendMapItem](#extendMapItem) and [mapItemBases](#mapItemBases) that can be used to quickly generate or extend [MapItems](#MapItem).

There is a [Full Example](#Full-Sequelize-Example) at the end of this doc that shows how an API using a Sequelize database source can configure AEC. The example includes defining an ErrorMap, MapItems, and using a `winston` logger. There is also a section with tips on [How to create your ErrorMap](#How-to-create-your-ErrorMap).

## Options

AEC constructor signature & defaults:

```sh
ApolloErrorConverter(options = {}, debug = false) -> formatError function
```

### `options.logger`: used for logging Errors

**default if `options.logger` is `undefined`**

```js
const defaultLogger = console.error;
```

**custom `options.logger`, NOTE: `winston` logger users [see winston usage](#winston-logger-usage)**

```js
const options = {
  logger: false, // disables logging of unmapped Errors
  logger: true, // enables logging using the default logger
  logger: yourLogger, // enables logging using this function / method
};
```

### `options.fallback`: a MapItem used for processing unmapped Errors

**default if `options.fallback` is `undefined`**

```js
const defaultFallback = {
  logger: defaultLogger, // or options.logger if defined
  code: "INTERNAL_SERVER_ERROR",
  message: "Internal Server Error",
  data: {},
};
```

**custom `options.fallback`, for more details on configuring a custom `fallback` see [MapItem](#MapItem)**

```js
const options = {
  // a fallback MapItem
  fallback: {
    code: "", // the Error code you want to use
    message: "", // the Error message you want to use
    data: {
      // additional pre-formatted data to include
    },
    data: originalError => {
      // use the original Error to format and return extra data to include
      return formattedDataObject;
    },
  },
};
```

### `errorMap`: the ErrorMap used for customized Error processing

The ErrorMap associates an Error to a [MapItem](#MapItem) by the `name`, `code` or `type` property of the original Error object. You can reuse MapItems for more than one entry.

**default if `options.errorMap` is `undefined`**

```js
const defaultErrorMap = {};
```

**custom `options.errorMap`, see [ErrorMap](#ErrorMap) for design details and [MapItem](#MapItem) for configuring an Error mapping**

```js
const options = {
  errorMap: {
    ErrorName: MapItem, // map by error.name
    ErrorCode: MapItem, // map by error.code
    ErrorType: MapItem, // map by error.type
  },
};
```

**multiple ErrorMaps**

The most robust way to use AEC is to create ErrorMaps for each of your data sources. You can then reuse the ErrorMaps in other projects that use those data sources. You can pass an Array of ErrorMap Objects as `options.errorMap` which will be automatically merged.

```js
const options = {
  errorMap: [errorMap, otherErrorMap],
};
```

**note: the `errorMap` is validated during construction of AEC**

- an Error will be thrown by the first `MapItem` that is found to be invalid within the `errorMap` or merged `errorMap`
- this validation prevents unexpected runtime Errors after server startup

## `winston` logger usage

Winston logger "level methods" are bound to the objects they are assigned to. Due to the way [winston is designed](https://github.com/winstonjs/winston/issues/1591#issuecomment-459335734) passing the logger method as `options.logger` will bind `this` to the options object and cause the following Error when used:

```sh
TypeError: self._addDefaultMeta is not a function
```

In order to pass a `winston` logger level method as `options.logger` use the following approach:

```js
const logger = require("./logger"); // winston logger object
const { ApolloErrorConverter } = require("apollo-error-converter");

new ApolloServer({
  formatError: new ApolloErrorConverter({
    // assign logger.<level> as the configured logger
    logger: logger.error.bind(logger), // bind the original winston logger object
  }),
});
```

**this behavior also applies to `winston` logger methods assigned in [MapItem](#MapItem) configurations**

```js
const mapItem = {
  // other MapItem options,
  logger: logger.warning.bind(logger),
};
```

## Debug Mode

Debug mode behaves as if no `formatError` function exists.

- all Errors are passed through directly from the API server to the consumer
- to enter debug mode pass `true` as the second argument in the constructor

```js
new ApolloServer({
  formatError: new ApolloErrorConverter(options, true),
});
```

# ErrorMap

The ErrorMap is a registry for mapping Errors that should receive custom handling. It can be passed as a single object or an Array of individual ErrorMaps which are automatically merged (see [Options](#Options) for details).

For tips on designing your ErrorMap See [How to create your ErrorMap](#How-to-create-your-ErrorMap) at the end of the docs.

ErrorMaps are made up of `ErrorIdentifier: MapItem` mapping entries. Error Objects can be identified by their `name`, `code` or `type` property.

Core `NodeJS` Errors use the `code` property to distinguish themselves. However, 3rd party libraries with custom Errors use a mixture of `.name`, `.code` and `type` properties.

**examples**

```js
const errorMap = {
  // error.name is "ValidationError"
  ValidationError: MapItem,
  // error.code is "ECONNREFUSED"
  ECONNREFUSED: MapItem,
  // error.type is "UniqueConstraint"
  UniqueConstraint: MapItem,
};
```

You can choose to create multiple ErrorMaps specific to each of your underlying data sources or create a single ErrorMap for your entire API. In the future I hope people share their MapItems and ErrorMaps to make this process even easier.

# MapItem

The MapItem represents a configuration for processing an Error matched in the ErrorMap. You can also set AEC `options.fallback` to a MapItem to customize how unmapped Errors should be handled. MapItems can be reused by assigning them to multiple Error identifiers in the [ErrorMap](#ErrorMap).

MapItems can be created using object literals or extended from another MapItem using the additional package export [extendMapItem](#extendMapItem).

A MapItem configuration is made up of 4 options:

```js
const mapItem = {
  code,
  data,
  logger,
  message, // required
};
```

**REQUIRED**

- `message`: the client-facing message
  - appears as a top level property in the Error emitted by Apollo Server

**OPTIONAL**

- `logger`: used for logging the original Error
  - default: does not log this Error
  - `false`: does not log this Error
  - `true`: logs using AEC `options.logger`
  - `function`: logs using this function
    - **`winston` logger users [see note on usage](#winston-logger-users)**
- `code`: a code for this type of Error
  - default: `'INTERNAL_SERVER_ERROR'`
  - Apollo suggested format: `ALL_CAPS_AND_SNAKE_CASE`
  - appears in `extensions.code` property of the Error emitted by Apollo Server
- `data`: used for providing supplementary data to the API consumer
  - default: `{}` empty Object
  - an object: `{}`
    - preformatted data to be added to the converted Error
  - a function: `(originalError) -> {}`
    - a function that receives the original Error and returns a formatted `data` object
    - useful for extracting / shaping Error data that you want to expose to the consumer
  - appears in `extensions.data` property of the Error emitted by Apollo Server
- **example of a data processing function (from [Full Sequelize Example](#Full-Sequelize-Example))**

```js
/**
 * Extracts and shapes field errors from a Sequelize Error object
 * @param {ValidationError} validationError Sequelize ValidationError or subclass
 * @return {{ fieldName: string }} field errors object in { field: message, } form
 */
const shapeFieldErrors = validationError => {
  const { errors } = validationError;
  if (!errors) return {};

  const fields = errors.reduce((output, validationErrorItem) => {
    const { path, message } = validationErrorItem;
    return { ...output, [path]: message };
  }, {});

  return fields;
};

const mapItem = {
  data: shapeFieldErrors,
  code: "INVALID_FIELDS",
  message: "these fields are no good man",
};

const errorMap = {
  ValidationError: mapItem,
};
```

# extendMapItem

The `extendMapItem()` utility creates a new MapItem from a base and extending options. The `options` argument is the same as that of the [MapItem](#MapItem). If an option already exists on the base MapItem it will be overwritten by the value provided in `options`.

**If the configuration provided in the `options` results in an invalid MapItem an Error will be thrown.**

```js
const mapItem = extendMapItem(mapItemToExtend, {
  // new configuration options to be applied
  code,
  data,
  logger,
  message,
});

// add the new MapItem to your ErrorMap
```

## mapItemBases

As a convenience there are some MapItems provided that can be used for extension or as MapItems themselves. They each have the minimum `message` and `code` properties assigned.

```js
const InvalidFields = {
  code: "INVALID_FIELDS",
  message: "Invalid Field Values",
};

const UniqueConstraint = {
  code: "UNIQUE_CONSTRAINT",
  message: "Unique Constraint Violation",
};
```

**usage**

```js
const {
  extendMapItem,
  mapItemBases: { InvalidFields },
} = require("apollo-error-converter");

const mapItem = extendMapItem(InvalidFields, {
  message: "these fields are no good man",
  data: error => {
    /* extract some Error data and return an object */
  },
});

// mapItem has the same InvalidFields code with new message and data properties
```

## How to create your ErrorMap

When designing your ErrorMap you need to determine which `ErrorIdentifier`, the `name`, `code` or `type` property of the Error object, to use as a mapping key. Once you know the identifier you can assign a MapItem to that entry. Here are some suggestions on determining the identifiers:

Using AEC logged Errors

- Because unmapped Errors are automatically logged (unless you explicitly turn off logging) you can reflect on common Errors showing up in your logs and create [MapItems](#MapItem) to handle them
  - check the `name`, `code` or `type` property of the Error in your log files
  - determine which is suitable as an identifier and create an entry in your ErrorMap

Determining identifiers during development

- Inspect Errors during testing / development
  - log the Error itself or `error.[name, code, type]` properties to determine which identifier is suitable

Determining from Library code

- Most well-known libraries define their own custom Errors
  - do a GitHub repo search for `Error` which may land you in a file / module designated for custom Errors
  - see what `name`, `code` or `type` properties are associated with the types of Errors you want to map
- links to some common library's custom Errors
  - [NodeJS system `code` properties](https://nodejs.org/api/errors.html#errors_common_system_errors)
    - many 3rd party libs wrap native Node system calls (like HTTP or file usage) which use these Error codes
    - for example `axios` uses the native `http` module to make its requests - it will throw Errors using the `http` related Error `codes`
  - [Mongoose (MongoDB ODM) `name` / `code` properties](https://github.com/Automattic/mongoose/blob/master/lib/error/mongooseError.js#L30)
    - **note that Schema index based Errors (like unique constraints)** will have the generic `MongooseError` `name` property. Use the `code` property of the Error to map these types
      - `error.code = 11000` is associated with unique index violations
      - `error.code = 11001` is associated with bulk unique index violations
  - [Sequelize (SQL ORM) `name` properties](https://doc.esdoc.org/github.com/sequelize/sequelize/identifiers.html#errors)
  - [ObjectionJS (SQL ORM)](https://vincit.github.io/objection.js/)
    - [ValidationError](https://vincit.github.io/objection.js/api/types/#class-validationerror)
    - [NotFoundError](https://vincit.github.io/objection.js/api/types/#class-notfounderror)
    - more robust Errors using the [`objection-db-errors` plugin](https://github.com/Vincit/db-errors)

## Full Sequelize Example

Here is an example that maps Sequelize Errors and uses `winston` logger methods. It is all done in one file here for readability but would likely be separated in a real project.

A good idea for organization is to have each data source (db or service) used in your API export their corresponding ErrorMap. You can also centralize your ErrorMaps as a team-scoped (or public!) package that you install in your APIs. You can then merge these ErrorMaps by passing them as an Array to AEC `options` (see below).

```js
const {
  ApolloServer,
  ApolloError,
  UserInputError,
} = require("apollo-server-express");
const {
  ApolloErrorConverter,
  extendMapItem,
  mapItemBases,
} = require("apollo-error-converter");

const logger = require("./logger"); // winston logger, must be binded
const { schema, typeDefs } = require("./schema");

/**
 * Extracts and shapes field errors from a Sequelize Error object
 * @param {ValidationError} validationError Sequelize ValidationError or subclass
 * @return {{ fieldName: string }} field errors object in { field: message, } form
 */
const shapeFieldErrors = validationError => {
  const { errors } = validationError;
  if (!errors) return {};

  const fields = errors.reduce((output, validationErrorItem) => {
    const { path, message } = validationErrorItem;
    return { ...output, [path]: message };
  }, {});

  return fields;
};

const fallback = {
  message: "Something has gone horribly wrong",
  code: "INTERNAL_SERVER_ERROR",
  data: () => ({ timestamp: Date.now() }),
};

const sequelizeErrorMap = {
  SequelizeValidationError: extendMapItem(mapItemBases.InvalidFields, {
    data: shapeFieldErrors,
  }),

  SequelizeUniqueConstraintError: extendMapItem(mapItemBases.UniqueConstraint, {
    logger: logger.db.bind(logger), // db specific logger, winston logger must be binded
  }),
};

const formatError = new ApolloErrorConverter({
  errorMap: sequelizeErrorMap,
  // or for multiple data source ErrorMaps
  errorMap: [sequelizeErrorMap, otherDataSourceErrorMap],
  fallback,
  logger: logger.error.bind(logger), // error specific logger, winston logger must be binded
});

module.exports = new ApolloServer({
  typeDefs,
  resolvers,
  formatError,
});
```

Behaviors for Errors received in `formatError`:

- unmapped Errors
  - logged by `logger.error` method from a `winston` logger
  - converted using custom `fallback`
    - sets a custom `message`, `code` and `data.timestamp`
- mapped Errors
  - `SequelizeUniqueConstraintError`
    - extends `UniqueConstraint` from `mapItemBases`
    - (from base) uses code `'UNIQUE_CONSTRAINT'`
    - (from base) uses message `'Unique Constrain Violation'`
    - (extended) logs original Error with `logger.db` method
  - `SequelizeValidationError`
    - extends `InvalidFields` from `mapItemBases`
    - (from base) uses code `'INVALID_FIELDS'`
    - (from base) uses message `'Invalid Field Values'`
    - (extended) adds field error messages extracted from the original Error by `shapeFieldErrors()`
    - does not log
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through
