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
