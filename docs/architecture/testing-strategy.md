# Testing Strategy

Date: 2026-04-10
Status: Current testing baseline after activity feed implementation and hardening.

## Current Approach

The project uses Vitest as the test runner and Supertest to exercise HTTP endpoints through the Express application.

The current suite is intentionally integration-oriented:

- tests call the real Express app
- tests use the Prisma client
- tests use an isolated in-memory SQLite datasource
- tests verify both HTTP responses and persistence side effects

## Why This Approach Was Chosen

At the time this approach was introduced, the codebase was route-centric and had no service or repository abstraction.
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
- forbidden access for non-members
- sanitized register responses
- sanitized user lookup responses
- invalid registration payload rejection
- invalid route parameter rejection
- invalid card movement payload rejection
- invalid comment payload rejection

Current automated test count: 11.

## Current Limitations

The testing baseline is useful but still incomplete.
The project does not yet include:

- unit tests around reusable domain logic at the service level
- broader integration coverage for users, boards, and cards endpoints
- mutation testing infrastructure
- contract tests for response shape stability

There is now a better base for unit tests because service modules exist, but the current coverage remains integration-heavy.

## Next Testing Steps

Recommended order for follow-up work:

1. Add focused unit tests around card movement, board membership checks, and activity mapping logic.
2. Expand integration coverage for boards, comments, and error handling.
3. Add unit tests around validation helpers and service-level rules.
4. Add mutation testing once the unit and integration baseline is more complete.

## Mutation Testing Note

Mutation testing is still a stated engineering goal for this workspace, but it was not introduced yet because the current coverage is still dominated by integration tests.
It should be added after the service layer has dedicated unit tests and the current validation/service rules have direct unit coverage.
