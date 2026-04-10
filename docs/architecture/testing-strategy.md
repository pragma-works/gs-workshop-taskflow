# Testing Strategy

Date: 2026-04-10
Status: Current testing baseline after activity feed implementation.

## Current Approach

The project uses Vitest as the test runner and Supertest to exercise HTTP endpoints through the Express application.

The current suite is intentionally integration-oriented:

- tests call the real Express app
- tests use the Prisma client
- tests use an isolated in-memory SQLite datasource
- tests verify both HTTP responses and persistence side effects

## Why This Approach Was Chosen

The codebase is route-centric and currently has no service or repository abstraction.
Because of that, mock-heavy unit tests would provide weak confidence and would require reproducing Prisma behavior manually.

In-memory SQLite integration tests offer a better tradeoff for the current state of the project:

- they exercise real routing behavior
- they validate Prisma transactions against a real relational database engine
- they avoid touching the local development database
- they remain fast enough for workshop-scale feedback

## Covered Scenarios

The current suite validates:

- unauthorized access to the authenticated feed
- successful card move event persistence
- chronological ordering of preview results
- rollback behavior when movement fails

## Current Limitations

The testing baseline is useful but still incomplete.
The project does not yet include:

- unit tests around reusable domain logic, because that logic is not yet extracted
- broader integration coverage for users, boards, and cards endpoints
- mutation testing infrastructure
- contract tests for response shape stability

## Next Testing Steps

Recommended order for follow-up work:

1. Extract reusable business logic from routes into services.
2. Add focused unit tests around card movement and activity mapping logic.
3. Expand integration coverage for authorization and error handling.
4. Add mutation testing once the unit and integration baseline is more complete.

## Mutation Testing Note

Mutation testing is still a stated engineering goal for this workspace, but it was not introduced yet because the current application structure would produce noisy and low-value results.
It should be added after core logic is extracted from the route layer.
