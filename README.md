# Apollo Error Converter

[![Build Status](https://travis-ci.org/the-vampiire/apollo-error-converter.svg?branch=master)](https://travis-ci.org/the-vampiire/apollo-error-converter) [![Coverage Status](https://coveralls.io/repos/github/the-vampiire/apollo-error-converter/badge.svg?branch=master)](https://coveralls.io/github/the-vampiire/apollo-error-converter?branch=master) [![NPM Package](https://img.shields.io/npm/v/apollo-error-converter.svg?label=NPM:%20apollo-error-converter)](https://npmjs.org/apollo-error-converter)

A utility for greatly simplifying GraphQL Apollo Server Error handling without sacrificing core principles:

1. Hide implementation details exposed from Errors thrown by resolvers and their underlying calls
2. Provide logging of thrown Errors for internal administrative use and records
3. Provide clean and useful Errors to the clients consuming the API

# Why was this package made?

When designing a public facing API it's important to hide implementation details of your codebase for security and consumer experience. By design GraphQL provides a layer of abstraction that hides internal implementations behind its public facing Types, Queries, and Mutations. However, one of the most prevalent sources of leaking implementation details comes from Errors thrown within the API server's resolver functions.

Thrown Errors should be transparent for internal use (logging) while also being cleaned and shaped for the consumer. The latter is designed to provide the minimum information needed for the consumer to identify and/or resolve the source of the issue.

## Current state of Apollo Server Error handling

Apollo's goals revolve around providing powerful and intuitive tooling while remaining unopinionated with how that tooling should be used. The Apollo team has done a fantastic job with designing their various libraries but Error handling in Apollo Server is still a tedious and repetitious pain point. Let's explore the current state of Error handling in Apollo Server (full documentation can be found [here](https://www.apollographql.com/docs/apollo-server/features/errors)):

- `NODE_ENV=production` strips stack traces from Errors sent in responses
- `debug: false` in the `ApolloServer` constructor strips stack traces on other `NODE_ENV` settings
- A set of `ApolloError` base & subclass constructors is available in all `apollo-server-X` libs
  - designed to adhere to the GraphQL spec Error procedures and ease of usage in associated Apollo Client libraries
  - subclasses can be derived from `ApolloError` to further customize Error handling
  - can be used in the codebase for catching original Errors and re-throwing in an `ApolloError` format
- a `formatError` function option in the `ApolloServer` constructor
  - the gateway between Errors thrown within resolvers and the response to the API consumer
  - a function designed to receive an Error object, whatever is returned by the function is passed in the response
  - Errors can be captured here for logging and shaping before exiting

In order to maintain core principles within the bounds of what Apollo Server makes available the following patterns emerge

- resolver level handling
  - `try/catch` or `.catch()` usage in resolvers
  - logging is performed in each resolver
  - Errors can be caught and rethrown in an `ApolloError` format
  - **benefits**
    - custom handling of Error types with respect to logging and shaping
  - **issues**
    - **every single resolver** must have its Errors explicitly handled
    - behavior must be tediously repeated throughout the codebase
    - custom handling logic is not portable across codebases
- global level handling
  - Errors are handled in a single location - the `formatError` function
  - Error logging can be performed
  - Error formatting through shaping or returning `ApolloError` objects
  - **benefits**
    - centralizes Error logging and shaping logic to reduce repitition
  - **issues**
    - complexity in customizing the handling of specific Error types
    - custom handling logic is not portable across codebases

## Solution

`apollo-error-converter` is an answer that combines the benefits and negates the issues associated with the previous patterns. The core export `ApolloErrorConverter` [AEC] constructs a utility assigned to the `ApolloServer` constructor `formatError` option and provides global Error handling. It is designed to maintain core principles while removing tedious and repetitive logic throughout the codebase.

AEC is designed to only expose `ApolloError`-shaped Errors to the API consumer. It accomplishes this by shaping and converting all resolver-thrown Errors into an `ApolloError` equivalent. At the same time it provides customizable logging behavior of original Errors for internal usage.

AEC uses MapItems that define a configuration for how an Error should be processed and converted. An ErrorMap is used to associate a MapItem to an Error based on the Error's `name`, `code` or `type` property. Unmapped Errors (those that do not have an entry in the ErrorMap) are handled by a fallback MapItem.

Here are some highlights:

- never exposes raw Error details like types, messages, data and stack traces
- only exposes readable and useable `ApolloError` Errors that adhere to the GraphQL spec and Apollo Client libs
- **never write Error handling logic in resolvers or underlying functions again!**
  - for backwards compatibility and flexibility
    - any `ApolloError` objects received from resolvers are passed through untouched
    - allows teams to implement or transition from resolver-level Error handling
- custom Error handling of "mapped Errors" through the use of an [ErrorMap](#ErrorMap)
  - the ErrorMap maps an Error by its `name`, `code` or `type` property to a MapItem
  - [MapItem](#MapItem) objects provide a simple means of Error handling on a per Error basis including
    - custom messages
    - custom supplementary data
    - custom logging behavior
  - MapItems can be assigned to multiple mappings for reusability
- **ErrorMaps and MapItems are portable and extendable across codebases and teams**
  - define them once for your team or third party libs and reuse them in any other Apollo Server projects
  - easily extend or reconfigure individual MapItems or ErrorMaps to fit the needs of the project
- automatic logging of "unmapped Errors"
  - over time your team can develop new MapItems from these logs to customize the handling of recurring Errors
- customizable logging of mapped Errors
  - use a default or task-specific logger in a MapItem to help organize your Error logs

# Usage

Install using [npm](https://npmjs.org/apollo-error-converter):

```sh
npm i apollo-error-converter
```

Configure as the `formatError` option of the `ApolloServer` constructor

```js
const {
  ApolloErrorConverter, // required: core export
  extendMapItem, // optional: tool for extending MapItems with new configurations
  mapItemBases // optional: MapItem bases of common Errors that can be extended
} = require('apollo-error-converter');

// assign it to the formatError option in ApolloError constructor
new ApolloServer({
  formatError: new ApolloErrorConverter(), // defaults
  formatError: new ApolloErrorConverter({ logger, fallback, errorMap }); // customized
  formatError: new ApolloErrorConverter({ logger, fallback, errorMap }, true); // enables debug mode
});
```

AEC can have every aspect of its behavior customized through the [`options` object](#Options) in its constructor. In addition there are two other exports [extendMapItem](#extendMapItem) and [mapItemBases](#mapItemBases) that can be used to quickly generate or extend [MapItems](#MapItem) for your use case.

Some examples are available in the [Configuration](#Configuration) section

- [Default Configuration](#Default-Configuration) example with no options
- [Custom Configuration](#Custom-Configuration) example with options
- [Full Example](#Full-Example) a Sequelize example including ErrorMap, MapItems, and AEC configuration

## Options

AEC constructor signature & defaults:

`(options = {}, debug = false) -> formatError function`

The `options` object, its property defaults, and behaviors:

- `logger`: used for logging Errors
  - default: `console.error`
  - values
    - `false`: disables logging of unmapped Errors
    - `true`: enables logging using the default logger
    - `function`: enables logging using this function / method
      - **`winston` logger users [see note below](#winston-logger-users)**
- `fallback`: a MapItem used for handling unmapped Errors
  - default: `{ message: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR', logger }`
    - the `logger` property will use `options.logger` or the default logger
  - values
    - a MapItem, see [MapItem](#MapItem) for details
- `errorMap`: the ErrorMap used for custom Error handling
  - made up of [MapItem](#MapItem) entries, see [ErrorMap](#ErrorMap) for details
  - default: `{}`
  - values
    - single ErrorMap object with all of your MapItem configurations
    - `[ErrorMap]`: an Array of individual ErrorMaps
      - will be merged into a single ErrorMap object internally
  - **note: the `errorMap` is validated during construction of AEC**
    - an Error will be thrown by the first `MapItem` that is found to be invalid within the `errorMap` or merged `errorMap`
    - this validation prevents unexpected runtime Errors after server startup

## `winston` logger users

`winston` logger "level methods" are bound to the objects they are assigned to. AEC receives a logger method in its options object. Due to the way `winston` is designed passing the logger method will bind `this` to the options object.

The logger method must be binded to the `winston` logger object when assigned to the AEC options - [read more from the `winston` maintainers here](https://github.com/winstonjs/winston/issues/1591#issuecomment-459335734).

If you do not bind the logger method you will receive this error:

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
    // here we are using the error level method but any can be assigned
    logger: logger.error.bind(logger), // bind it to the original winston logger object
  }),
});
```

**note: this behavior also applies to `winston` logger methods assigned in [MapItem](#MapItem) configurations**

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
  - any truthy value will enable debug mode
    - String env variables or other mechanisms may be used to control its activation as needed
- default: `false`

# ErrorMap

The ErrorMap is a registry for mapping Errors that should receive custom handling. It can be passed as a single object or an Array of individual ErrorMaps which are automatically merged (see [Options](#Options) for details). See [the following section](#How-to-create-your-ErrorMap) for tips on designing your ErrorMap.

The structure of the ErrorMap is simple yet portable and extendable for reuse in other projects. It associates an original Error to a [MapItem](#MapItem) configuration by the Error's `name`, `code` or `type` property.

Core Node Errors use the `code` property to distinguish themselves. However, 3rd party libraries with custom Errors use a mixture of `.name`, `.code` and `type` properties since no standard is enforced. Your own custom Errors themselves should expose at least one of these properties as a best practice. To support a wide range of use cases AEC accepts any of these properties for mapping.

```js
const errorMap = {
  ErrorName: MapItem,
  ErrorCode: OtherMapItem,
  OtherErrorName: MapItem, // reuse MapItem configurations
  ...
};
```

You can choose to create multiple ErrorMaps specific to each of your underlying data sources or create a single ErrorMap for your entire API service. The choices are available to support any level of complexity or service structure that works for your team. In the future I hope people share their [MapItems](#MapItem) and ErrorMaps to make this process even easier.

## How to create your ErrorMap

When designing your ErrorMap you need to determine which identifier (`name`, `code` or `type` property of the Error object) to use as a mapping key. Once you know the identifier you can assign a new or re-use an existing [MapItem](#MapItem) to that entry in the ErrorMap. Here are some suggestions on determining the identifiers:

Using AEC logged Errors

- Because unmapped Errors are automatically logged (unless you explicitly turn off logging) you can reflect on common Errors showing up in your logs and create [MapItems](#MapItem) to handle them
  - check the `name`, `code` or `type` property of the Error in your log files
  - determine which is suitable as an identifier and create an entry in your ErrorMap

Determining identifiers during development

- Inspect Errors during testing / development
  - log the Error itself or `error.[name, code, type]` properties to determine which identifier is suitable

Determining from Library code

- Most large libraries organize their custom Errors within a file or module
  - you can do a GitHub repo search for `Error` which may land you in a file / module designated for custom Errors
  - see what `name`, `code` or `type` properties are associated with the types of Errors you want to map
- links to some common library's custom Errors
  - [NodeJS system `code` properties](https://nodejs.org/api/errors.html#errors_common_system_errors)
    - many 3rd party libs wrap native Node system calls (like HTTP or file usage) which use these Error codes
    - for example `axios` uses the native `http` module to make its requests - it will throw Errors using the `http` related Error `code`s
  - [Mongoose (MongoDB ODM) `name` / `code` properties](https://github.com/Automattic/mongoose/blob/master/lib/error/mongooseError.js#L30)
    - **note that Schema index based Errors (like unique constraints)** will have the generic `MongooseError` `name` property. Use the `code` property of the Error to map these types
      - `error.code = 11000` is associated with unique index violations
      - `error.code = 11001` is associated with bulk unique index violations
  - [Sequelize (SQL ORM) `name` properties](https://doc.esdoc.org/github.com/sequelize/sequelize/identifiers.html#errors)

# MapItem

The MapItem represents a single configuration for mapping an Error in an ErrorMap. You can also set AEC `options.fallback` to a MapItem to customize how unmapped Errors should be converted.

A MapItem is a customizable rule for how the Error it is mapped to should be processed and converted. MapItems are portable across codebasese and can be reused by assigning them to multiple Error identifiers in the [ErrorMap](#ErrorMap).

MapItems can be created using object literals or extended from another MapItem using the additional package export [extendMapItem](#extendMapItem).

A MapItem configuration is made up of 4 options that customize how the Error should be handled:

```js
const mapItem = {
  // REQUIRED
  message,

  // OPTIONAL
  code,
  data,
  logger,
};
```

**REQUIRED**

- `message`: the client-facing message
  - only `String`s are accepted

**OPTIONAL**

- `logger`: used for logging the original Error
  - values
    - `false` or `undefined`: does not log
    - `true`: logs using AEC `options.logger`
    - `function`: logs using this function
      - **`winston` logger users [see note above](#winston-logger-users)**
- `code`: a formatted code for this type of Error
  - only `String`s are accepted
  - default: `'INTERNAL_SERVER_ERROR'`
  - Apollo suggested format: `ALL_CAPS_AND_SNAKE_CASE`
  - appears in `extensions.code` property of the Error emitted by Apollo Server
- `data`: used for providing supplementary data to the API consumer
  - appears in `extensions.data` property of the Error emitted by Apollo Server
  - values
    - object: preformatted data to be added to the converted Error
    - function: `(originalError) -> {}`
      - a function that receives the original Error and returns a formatted `data` object
      - useful for extracting / shaping Error data that you want to expose to the consumer

# extendMapItem

The `extendMapItem()` utility can be used to extend existing MapItems with new configuration options. It receives a MapItem to extend and an `options` object argument. It returns a new MapItem extended with the options. The `options` argument is the same as that of the [MapItem](#MapItem). If an option already exists on the base MapItem it will be overwritten by the value provided in `options`.

**If the configuration provided in the `options` results in an invalid MapItem an Error will be thrown.**

```js
const mapItem = extendMapItem(mapItemToExtend, {
  // new configuration options (all optional) to be applied
  code,
  data,
  logger,
  message,
});

// add the new MapItem to your ErrorMap
```

## mapItemBases

As a convenience there are two MapItems provided that can be used for extension or as MapItems themselves. They each have the minimum `message` and `code` properties assigned.

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

Example usage

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

Example of a data processing function (from [Full Sequelize Example](#Full-Example))

```js
const {
  extendMapItem,
  mapItemBases: { InvalidFields },
} = require("apollo-error-converter");

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

const mapItem = extendMapItem(InvalidFields, {
  message: "these fields are no good man",
  data: shapeFieldErrors,
});
```

# Configuration

## Default Configuration

To use the defaults all you need to do is instantiate the AEC and assign it to the `formatError` option:

```js
const { ApolloErrorConverter } = require("apollo-error-converter");

// assign it to the formatError option
new ApolloServer({
  formatError: new ApolloErrorConverter(),
});
```

Behaviors for Errors received in `formatError`:

- unmapped Errors
  - logged by default `logger`
  - converted using default `fallback`
  - see [Options](#Options) for default values
- mapped Errors
  - all Errors are considered unmapped in this configuration
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through

## Custom Configuration

```js
const { ApolloErrorConverter } = require("apollo-error-converter");

// assign it to the formatError option
new ApolloServer({
  formatError: new ApolloErrorConverter({ logger, fallback, errorMap }),
  // sets debug mode to true
  // formatError: new ApolloErrorConverter({ logger, fallback, errorMap }, true),
});
```

Behaviors for Errors received in `formatError`:

- **if `debug` mode is enabled no action is taken, see [Debug](#Debug)**
- unmapped Errors
  - logged using
    - `options.logger`
    - no logger: the default logger (see [Options](#Options))
  - converted using
    - `options.fallback`
    - no fallback: the default fallback (see [Options](#Options))
- mapped Errors
  - behavior dependent on [MapItem](#MapItem) configuration for the corresponding Error
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through

## Full Example

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
  // errorMap: [sequelizeErrorMap, ...otherDataSourceErrorMap] for merging multiple
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
    - (extended) adds additional data extracted from the original Error by `shapeFieldErrors()`
    - does not log
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through
