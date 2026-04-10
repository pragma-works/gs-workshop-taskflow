# Decision: keep Prisma behind a repository layer

## Context

The workshop starter mixed HTTP handling, authorization decisions, nested data loading, and Prisma calls directly inside route files. That made the new activity feed harder to add safely and also hurt the repo's bounded/composable scoring goals.

## Decision

Move all Prisma access into `src/repositories/taskflowRepository.ts`, keep shared auth/error helpers in `src/lib`, and let route files focus on request parsing, authorization entry points, and HTTP responses.

## Why

- The card move flow needs one transaction for both the card update and the activity event write.
- The activity feed needs relation-heavy reads without query loops in route handlers.
- Tests are easier to run against the real app when the data access boundary is stable and reusable.
- The scoring rubric explicitly rewards keeping direct database access out of routes.

## Consequences

- Route files are thinner and easier to reason about.
- Prisma query changes now live in one place instead of being repeated across multiple routes.
- The in-memory integration tests cover both the HTTP layer and the repository layer with the same setup.
- Future work can split the repository further by domain without changing endpoint contracts.
