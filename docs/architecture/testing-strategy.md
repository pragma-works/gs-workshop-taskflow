# Testing Strategy

Date: 2026-04-10
Status: Current testing baseline after activity feed implementation, hardening, repository extraction, and mutation-test setup.

## Current Approach

The project uses Vitest as the test runner and Supertest to exercise HTTP endpoints through the Express application.

The current suite is intentionally integration-oriented:

- tests call the real Express app
- tests use the Prisma client
- tests use an isolated in-memory SQLite datasource
- tests verify both HTTP responses and persistence side effects

The test strategy is now mixed rather than purely integration-oriented:

- integration tests verify real HTTP and Prisma behavior
- unit tests verify service-layer decision logic through injected dependencies
- mutation testing probes the strength of the service-level unit suite

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

The current unit suite validates:

- user registration sanitization and hashing flow
- login failure and success decision paths
- board ownership and mapping behavior
- card move validation and delegation behavior

Current automated test count: 21.

Current mutation score on the service layer: 32.81.
The Stryker HTML report is written to `reports/mutation/mutation.html`.

## Current Limitations

The testing baseline is useful but still incomplete.
The project does not yet include:

- broader integration coverage for users, boards, and cards endpoints
- contract tests for response shape stability

The project now includes unit tests and mutation testing infrastructure, but the mutation score shows that some service behaviors are still under-specified.

There is now a better base for unit tests because service modules exist, but the current coverage remains integration-heavy.

## Next Testing Steps

Recommended order for follow-up work:

1. Improve unit coverage for `activity-service` mapping and board-service negative paths.
2. Add unit tests that assert error messages and conditional branches more strictly.
3. Expand integration coverage for boards, comments, and error handling.
4. Add repository contract tests if persistence behavior starts becoming more complex.

## Mutation Testing Note

Mutation testing is now active through Stryker and targets the service layer with the unit test suite.
At this point, the priority is not introducing mutation testing, but using its output to close the surviving mutants in critical service logic.
