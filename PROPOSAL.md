# ApolloError Error Mapping Pattern
A design pattern for ensuring User facing Errors are always exposed as instances of `ApolloError`. This pattern restricts exposure of implementation details and provides a controlled and concise interface for Error handling in a GraphQL Apollo Server.

The implementation can be broken down into 3 principles:
- Each Data Source should export an Object of data interfaces and an optional Error Map respective to the data source:
  - Objects (models, utilities) which provide interfaces to their underlying data source
  - An Error Map which provides a mapping between the thrown Errors specific to the Data Source and its controlled equivalent ApolloError (or subclass)
- Data Source methods and their usage within resolvers do not need to be wrapped in `try/catch` or `.catch` calls
- All Errors thrown from within resolvers are funnelled to the final capturing zone: the `ApolloServer` config `formatError` option
  - `formatError` consumes the `rethrowAsApollo` utility which translates all thrown Errors into `ApolloError`/subclass equivalents before being emitted back to the client / User.

## Data Sources
Each data source should provide interfaces through Object methods (Models) and / or utility functions. These functions and methods create the bridge between a resolver which consumes them and the underlying data sources.

By separating the data sources from their consumption in the resolver layer we gain the following benefits:
- Separation of concerns
  - Data Source: responsible for controlled interaction with underlying data
    - the only mechanism of direct interaction with the data
  - Resolver: responsible for controlled communication between a client / User and resolution of behavior with a data source
    - the only mechanism of direct communication with the consumer (client / User)
- Modularized logic: data sources can be used in any future environments (both GraphQL and otherwise) as they have no affinity to their consumer

The data source may optionally export a loader function which will perform any startup / connection logic and return the Data Source Object discussed above. This approach should be used when utilizing the Apollo Server `dataSources` option.

Otherwise simply passing the Data Source Object into the Apollo Server `context` is appropriate. This approach indicates that startup / connection logic should be done in the same file as the Apollo Server construction. 

### Error Map
Each data source used in this Apollo Server pattern should provide an Error Map which provides a translation between Errors thrown by the data source and its corresponding `ApolloError` equivalent. The Error Map should contain entries for each Data Source Error `name` along with a mapping shape as a value. The mapping shape is as follows:

```js
{
  // required fields
  message: String,
  constructor: ApolloError,
  // optional fields
  data:? Object | Function
  logger:? Boolean | Function
}
```

- `message`: the final message emitted to the consumer
- `constructor`: An `ApolloError` or subclass constructor that the Data Source Error will be converted to when rethrown
- `data`: an optional field that provides additional context for the error
  - an Object with hard coded data specific to the Data Source Error
  - a function which consumes the original Data Source Error and produces a `data` Object output
- `logger`: an optional field that controls original Data Source Error logging behavior
  - `Boolean`: `true` to use the default logger method (provided in the `rethrowAsApollo` constructor)
    - `false` or `undefined` means ignore logging
  - `Function`: a logger method reference to use for logging this type of Error

Custom utility functions can be used to provide `data` shaping. It is recommended to place all utility functions as well as the Error Map in one file so that they can be easily referenced. 

To determine the Data Source Error types you can consult the library reference. Here is an example using `Sequelize` Error names:

```js
const errorMap = {
 'SequelizeValidationError': {
    message: 'Invalid Felds',
    constructor: UserInputError,
    data: (error) => shapeFieldErrors(error),
    // log omitted, do not log this Error
  },

  'SequelizeUniqueConstraintError': {
    message: 'Unique Violation',
    constructor: ValidationError,
    data: (error) => shapeFieldErrors(error),
    // log omitted, do not log this Error
  }
};
```

You can also create custom Error subclasses for the Data Source that can be thrown. In this case they should have a unique `name` property which identifies them. That `name` can be added to the Error Map to provide translation.

## `rethrowAsApollo`
This utility should be used in the `formatError` Apollo Server config option. Its purpose is to:
- consume every Error thrown by an underlying resolver
- translate the Error into its `ApolloError` equivalent
- perform logging as dictated by each Data Source Error Map and the logger configuration of `rethrowAsApollo`
- throw the translated `ApolloError` instance which will be emitted back to the API consumer

The `options` shape is as follows:

```js
{
  errorMaps:? Object | Array,
  fallback:? ApolloError | Object
  logger:? Function 
}
```

There are several options and defaults that can be used:

- `errorMaps` [optional]: Error Map Object(s)
  - `Array`: an Array of individual Error Maps which will be merged to a single Object
  - `Object`: a single Object which has already merged the individual Error Map Objects
  - `undefined`: no specific Error Maps provided, always use `fallback`
- `fallback` [optional]: The fallback used when no Error Map match is found for the Error that was thrown
  - `ApolloError`: an `ApolloError` constructor that should be used during rethrowing
  - `Object`: an Object of the same shape as Error Map entries which defines the `message`, `constructor` and optional `data`, `logger` behavior
  - `undefined`: defaults to
    - `message`: Internal Server Error
    - `constructor`: `ApolloError` (base type)
    - `logger`: the `options.logger` value
- `logger`: a logger method used for logging errors (as dictated by individual Error Map entries and/or `fallback` configuration)
  - `Function`: called whenever an Error should be logged
  - `undefined`: uses `console.error`

### instantiation behavior
- All Error Map Item(s) are verified to ensure correct shape and valid ApolloError/subclass constructors
  - throws `Error(Invalid Error Map Item: ${JSON.stringify(item)})` if verification fails to prevent runtime errors

## Apollo Server Configuration Example
In the Apollo Server configuration the `rethrowAsApollo` instance should be configured and passed in the Apollo Server `formatError` option field.

Here is an example that has the following simple structure with a single Data Source:
- Server Logger: `winston` with external configuration
- Data Sources: Sequelize
- Error Maps: Sequelize
- configuration

Directory Structure
```sh
server/
  index.js <--- Apollo Server construction / exporting
  data-sources/
    index.js <--- main exporter of Data Source(s) + Error Map(s)
    sequelize/
      index.js <--- exporter of models and errorMap
      errorMap.js <--- utility functions and Error Map exporter
      models/ <--- Sequelize models
        index.js <--- standard Sequelize models exporter
```

`server/data-sources/sequelize/errorMap.js`

```js
// constructors can be imported from any valid Apollo Error (JavaScript) source
// ex: apollo-server, apollo-server-express, ...
const { UserInputError, ValidationError } = require('apollo-server-express');

/**
 * Extracts and shapes field errors from a Sequelize Error object
 * @param {ValidationError} validationError Sequelize ValidationError or subclass
 * @return {{ fieldName: string }} field errors object in { field: message, } form
 */
const shapeFieldErrors = (validationError) => {
  const { errors } = validationError;
  if (!errors) return {};

  const fields = errors.reduce((output, validationErrorItem) => {
    const { message, path } = validationErrorItem;
    
    output[path] = message;
    return output;
  }, {});

  return fields;
};

const errorMap = {
 'SequelizeValidationError': {
    message: 'Invalid Felds',
    constructor: UserInputError,
    data: (error) => shapeFieldErrors(error),
  },

  'SequelizeUniqueConstraintError': {
    message: 'Unique Violation',
    constructor: ValidationError,
    data: (error) => shapeFieldErrors(error),
  }
};

module.exports = {
  errorMap,
  shapeFieldErrors,
};
```

`server/data-sources/sequelize/index.js`

```js
const models = require('./models');
const { errorMap } = require('./errorMap');

module.exports = {
  models,
  errorMap
};
```

`server/data-sources/index.js`

```js
const sequelize = require('./sequelize');

module.exports = {
  sequelize,
};
```

`server/index.js`

```js
// imports of tooling

// winston logger configured and exported from logger.js
const logger = require('./logger');

// importing models initializes the Sequelize connection logic
const {
  sequelize: { errorMap, models },
} = require('./data-sources');

const formatError = new rethrowAsApollo({
  errorMaps: errorMap, // only one Error Map, pass directly
  logger: logger.error, // error logger
  // default fallback
});

module.exports = new ApolloServer({
  typeDefs,
  resolvers,
  formatError,
  context: ({ req }) => ({
    // other context attributes
    models, // Sequelize models
  })
});
```

This configuration would result in the following behavior:

A `ValidationError` is thrown from a Sequelize model method consumed in a resolver:
- translated to `UserInputError`
- rethrown as `new UserInputError('Invalid Fields', { fields })
- no logging

A `UniqueConstrainError` is thrown from a Sequelize model method consumed in a resolver:
- translated to `ValidationError`
- rethrown as `new ValidationError('Unique Violation', { fields })
- no logging

Any un-mapped Error is thrown from a resolver:
- translated to `ApolloError`
- rethrown as `new ApolloError('Internal Server Error')
- logged through `logger.error` for internal use

Over time repeated Errors whose causes are determined can be added to the Error Map to provide customized rethrow and logging behavior. 









