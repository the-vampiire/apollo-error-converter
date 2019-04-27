# Apollo Error Converter
[![Build Status](https://travis-ci.org/the-vampiire/apollo-error-converter.svg?branch=master)](https://travis-ci.org/the-vampiire/apollo-error-converter)
[![Coverage Status](https://coveralls.io/repos/github/the-vampiire/apollo-error-converter/badge.svg?branch=master)](https://coveralls.io/github/the-vampiire/apollo-error-converter?branch=master)
![NPM Package](https://img.shields.io/npm/v/apollo-error-converter.svg?label=NPM:%20apollo-error-converter)

A utility for greatly simplifying GraphQL Apollo Server Error handling without sacrificing core principles:

1) Hide implementation details exposed from Errors thrown by resolvers and their underlying calls
2) Provide logging of thrown Errors for internal administrative use and records
3) Provide clean and useful Errors to the clients consuming the API

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
`apollo-error-converter` is an answer that combines the benefits and negates the issues associated with the previous patterns. The core export `ApolloErrorConverter` [AEC] constructs a utility assigned to the `ApolloServer` constructor `formatError` option and provides intelligent Error handling. It is designed to maintain core principles and provide customizability while abstracting tedious and repetitive logic. 

At its core AEC is designed to only expose `ApolloError` objects to the API consumer. It accomplishes this by converting all resolver-thrown Errors into a default or customized `ApolloError` equivalent. At the same time it provides customizable logging behavior of original Errors for internal usage.

Here are some highlights:

- never exposes raw Error details like types, messages, data and stack traces
- only exposes readable and useable `ApolloError` objects that adhere to the GraphQL spec and Apollo Client libs 
- **never write Error handling logic in resolvers or underlying functions again!**
  - for backwards compatibility and flexibility
    - any `ApolloError` objects received from resolvers are passed through untouched
    - allows teams to implement or transition from specific Error handling in resolvers
- custom Error handling of "mapped Errors" through the use of an [ErrorMap](#ErrorMap)
  - made up of [MapItem](#MapItem) objects which provide a simple means of Error handling on a per Error basis including
    - custom messages
    - custom supplementary data
    - custom logging behavior
    - custom `ApolloError` conversion
- ErrorMaps and MapItems are portable and extendable across codebases and teams
- automatic logging of "unmapped Errors"
  - over time your team can develop new MapItems from these logs to customize the handling of recurring Errors 

# Usage
Install using [npm](https://npmjs.org/apollo-error-converter): `npm i apollo-error-converter`

```js
const {
  ApolloErrorConverter, // required: core export
  extendMapItem, // optional: tool for extending MapItems
  mapItemBases // optional: MapItem bases for extension of common Errors
} = require('apollo-error-converter');

// assign it to the formatError option in ApolloError constructor
new ApolloServer({
  formatError: new ApolloErrorConverter(), // defaults
  formatError: new ApolloErrorConstructor({ logger, fallback, errorMap }); // customized
  formatError: new ApolloErrorConstructor({ logger, fallback, errorMap }, true); // enabled debug mode  
});
```

AEC can have every aspect of its behavior customized through the use of [`options` object](#Options) and [`debug` setting](#Debug) arguments in its constructor. In addition there are two other exports [extendMapItem](#extendMapItem) and [mapItemBases](#mapItemBases) that can be used to quickly generate or extend [MapItems](#MapItem).

Some examples are available in the [Configurations](#Configurations) section
- [Default Configuration](#Default-Configuration) example with no options
- [Custom Configuration](#Custom-Configuration) example with options
- [Full Example](#Full-Example) for a complete example including ErrorMap, MapItems, and AES configuration

## Options
AEC constructor signature & defaults: 

`(options = {}, debug = false) -> formatError function`

The `options` object, its property defaults, and behaviors:
- `logger`: used for logging unmapped Errors
  - default: `console.error`
  - values
    - `false`: disables all logging
    - `true`: enables logging using the default logger
    - `function`: enables logging using this function
- `fallback`: a MapItem used for handling unmapped Errors
  - default: `{ errorConstructor: ApolloError, message: 'Internal Server Error', logger }`
    - the `logger` property will use `options.logger` or the default logger
  - values
    - an `ApolloError` constructor
      - merges with the default `fallback`
    - a MapItem, see [MapItem](#MapItem) for details
- `errorMap`: the ErrorMap used for custom Error handling
  - made up of [MapItem](#MapItem) entries, see [ErrorMap](#ErrorMap) for details
  - default: `{}`
  - values
    - ErrorMap object with all of your MapItem configurations
    - `[ErrorMap]`: an Array of individual ErrorMaps
      - will be merged into a single ErrorMap object internally
  - **note: the `errorMap` is validated during construction of AES**
    - an Error will be thrown by the first `MapItem` that is found to be invalid within the `errorMap` or merged `errorMap`
    - this validation prevents unexpected runtime Errors after server startup

## Debug
Debug mode behaves as if no `formatError` function exists. 
- all Errors are passed through directly from the API server to the consumer
- to enter debug mode pass `true` as the second argument in the constructor
  - any truthy value will enable debug mode
    - String env variables or other mechanisms may be used to control its activation as needed
- default: `false`

# ErrorMap
The ErrorMap is a registry for mapping Errors that should receive custom handling. It can be passed as a single object or an Array of individual ErrorMaps which are automatically merged (see [Options](#Options) for details).

The structure of the ErrorMap is simple yet portable and extendable for reuse in other projects. It associates an original Error to a [MapItem](#MapItem) configuration by the Error's `name` property. 

```js
const errorMap = {
  ErrorName: MapItem,
  OtherErrorName: MapItem,
  ...
};
```

If you the Errors thrown in your application are controlled you can throw an object with a `name` property and map its behavior in the ErrorMap.

You can choose to create multiple ErrorMaps specific to each of your underlying data sources or create a single ErrorMap for your entire API service. The choices are available to support any level of complexity or service structure that works for your team. In the future I hope people share their [MapItems](#MapItem) and ErrorMaps to make this process even easier.

# MapItem
The MapItem represents a single configuration for mapping an Error. A MapItem is a customizable rule for how the Error it is mapped to should be handled. MapItems can be reused by assigning them to multiple Errors in the [ErrorMap](#ErrorMap). 

MapItems can be created using object literals or extended from a base MapItem using the two additional package exports [extendMapItem](#extendMapItem) and [mapItemBases](#mapItemBases).

A MapItem configuration is made up of 5 options that customize how the Error should be handled. Over time, through the use of unmapped Error logs, your team can design new MapItems to handle recurring Errors.

```js
const mapItem = {
  // REQUIRED
  message, 
  errorConstructor,

  // OPTIONAL
  code,
  data,
  logger,
}
```
**REQUIRED**
- `message`: the client-facing message
  - only `String`s are accepted
- `errorConstructor`: the `ApolloError` constructor to convert the original Error
  - must be an `ApolloError` or subclass
  - you can access these constructors from whatever `apollo-server-X` library you are using for your server

```js
const { ApolloError, ValidationError, UserInputError, ... } = require('apollo-server');
// require('apollo-server-express');
// require('apollo-server-core'); 
// etc

// use one of the constructors in the MapItem
```

```js
const { MyCustomApolloError } = require('./custom-errors');

// use your own custom ApolloError subclass in the MapItem
```

**OPTIONAL**
- `logger`: used for logging the original Error
  - values
    - `false` or `undefined`: does not log 
    - `true`: logs using AEC `options.logger`
    - `function`: logs using this function
- `code`: a formatted code for this type of Error
  - only `String`s are accepted
  - Apollo suggested format: `ALL_CAPS_AND_SNAKE_CASE`
  - **note: the `code` option is only applied to the following `ApolloError` types (this is by Apollo design)**
    - `ApolloError` base class and custom subclasses that expose a `code` argument in their constructor
      - see [Multi-Arg ApolloError](#Multi-Arg-ApolloError) for information on how the base `ApolloError` and custom subclasses are handled
- `data`: used for providing supplementary data to the API consumer
  - **note: the `data` option is only applied to the following `ApolloError` types (this is by Apollo design)**
    - `UserInputError` subclass
    - `ApolloError` base class and custom subclasses that expose a `properties` argument in their constructor
      - see [Multi-Arg ApolloError](#Multi-Arg-ApolloError) for information on how the base `ApolloError` and custom subclasses are handled
  - values
    - object: preformatted data to be added
    - function: `(originalError) -> {}`
      - a function thatt receives the original Error and returns a formatted `data` object
      - useful for extracting / shaping Error data that you want to expose

# extendMapItem
The `extendMapItem()` utility can be used to extend existing MapItems with new configuration options. It receives a MapItem to extend and an `options` object argument. It returns a new MapItem extended with the options. The `options` argument is the same as that of the [MapItem](#MapItem).

**If the configuration provided in the `options` results in an invalid MapItem an Error will be thrown.**

```js
const mapItem = extendMapItem(mapItemToExtend, {
  // new configuration options (all optional) to be applied
  code,
  data,
  logger,
  message,
  errorConstructor
});

// add the new MapItem to your ErrorMap
```

## mapItemBases
As a convenience there are two MapItems provided that can be used for extension or as MapItems themselves. They each have the minimum `message` and `errorConstructor` properties assigned. 

Note that `InvalidFields` is a 2 argument constructor and `UniqueConstraint` is a 1 argument constructor. For more detail about the implications of this see [Multi-Arg ApolloError](#Multi-Arg-ApolloError)

```js
/**
 * ApolloError: UserInputError
 * - 2 arguments constructor
 * - accepts MapItem.data field
 */
const InvalidFields = {
  message: 'Invalid Fields',
  errorConstructor: UserInputError,
};

/**
 * ApolloError: ValidationError
 * - 1 argument constructor
 * - does not accept MapItem.data field
 */
const UniqueConstraint = {
  message: 'Unique Violation',
  errorConstructor: ValidationError,
};
```

Example usage

```js
const { extendMapItem, mapItemBases: { InvalidFields } } = require('apollo-error-converter');

const mapItem = extendMapItem(InvalidFields, {
  message: 'a new message',
  data: error => { /* extract some data */},
});

// mapItem has the same errorConstructor, new message, new data properties
```

# Multi-Arg ApolloError
All of the `ApolloError` subclasses exported by `apollo-server-X` libs accept a single `message` argument. The only exception is the `UserInputError` subclass which accepts a `message` and `properties` (MapItem `data` option) argument.

The `ApolloError` base class accepts `message`, `code`, and `properties` arguments. Your own custom subclasses may have 1-3 arguments depending on its implementation.

In order to provide a dynamic API for this package a standard had to be set for handling a mapped Error using its corresponding MapItem. The standard determines which MapItem `option`s are applied to the `errorConstructor` based on the number of arguments it accepts.

- 1 argument constructor receives:
  - `message` option
  - `ApolloError` constructors with 1 argument
    - `ForbiddenError`
    - `ValidationError`
    - `AuthenticationError`
    - your own custom subclass
- 2 argument constructor receives:
  - `message` option
  - `data` option (if provided)
  - `ApolloError` constructors with 2 arguments
    - `UserInputError`
    - your own custom subclass
- 3 argument constructor receives:
  - `message` option
  - `data` option (if provided)
    - if not provided uses default empty object `{}`
  - `code` option (if provided)
    - if not provided uses default `INTERNAL_SERVER_ERROR` code
  - `ApolloError` constructors with 3 arguments
    - `ApolloError` base class
    - your own custom subclass

While you are free to implement your own custom subclasses, a simple solution is to use the base `ApolloError` class. The only benefit of implementing your own subclass is to have a custom `name` property. However, most API consumers will utilize the `code` property rather than `name`. In terms of AES functionality there is no distinction between the base class and your own subclass.

```js
const customMapItem = {
  code: 'CUSTOM_CODE_HERE',
  data: error => { /* extract original Error data to expose */ }
  message: 'your custom message',
  logger: error => { /* logs the original Error */ }
  errorConstructor: ApolloError,
};
```

# Configuration

## Default Configuration
To use the defaults all you need to do is instantiate the AEC and assign it to the `formatError` option:

```js
const { ApolloErrorConverter } = require('apollo-error-converter');

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
const { ApolloErrorConverter } = require('apollo-error-converter');

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
    - no logger: the default fallback (see [Options](#Options))
- mapped Errors
  - behavior dependent on [MapItem](#MapItem) configuration for the corresponding Error
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through

## Full Example
Here is an example that maps Sequelize Errors. It is all done in one "file" here for readability but would likely be separated in a real project.

```js
const { ApolloServer, ApolloError, UserInputError } = require('apollo-server-express');
const { ApolloErrorConverter, extendMapItem, mapItemBases } = require('apollo-error-converter');

const logger = require('./logger');
const { schema, typeDefs } = require('./schema');

/**
 * Extracts and shapes field errors from a Sequelize Error object
 * @param {ValidationError} validationError Sequelize ValidationError or subclass
 * @return {{ fieldName: string }} field errors object in { field: message, } form
 */
const shapeFieldErrors = (validationError) => {
  const { errors } = validationError;
  if (!errors) return {};

  const fields = errors.reduce((output, validationErrorItem) => {
    const { path, message } = validationErrorItem;
    return { ...output, [path]: message };
  }, {});

  return fields;
};

const fallback = {
  message: 'Internal Error',
  code: 'INTERNAL_SERVER_ERROR',
  errorConstructor: ApolloError,
};

const errorMap = {
  'SequelizeValidationError': extendMapItem(mapItemBases.InvalidFields, {
    data: shapeFieldErrors,
  }),

  'SequelizeUniqueConstraintError': extendMapItem(mapItemBases.UniqueConstraint, {
    logger: logger.db, // db specific logger
  }),
};

const formatError = new ApolloErrorConverter({
  errorMap,
  fallback,
  logger: logger.error, // error specific logger
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
    - (from base) converted to `ValidationError`
    - (from base) uses message `'Unique Violation'`
    - (extended) logs original Error with `logger.db` method
  - `SequelizeValidationError`
    - extends `InvalidFields` from `mapItemBases`
    - (from base) converted to `UserInputError`
    - (from base) uses message `'Invalid Fields'`
    - (extended) adds additional data extracted from the original Error by `shapeFieldErrors()`
    - does not log
- `ApolloError` (or subclass) Errors
  - no logging
  - passed through
