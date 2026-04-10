# Activity Feed Decision

## Decision

Activity feed reads and writes use a repository module instead of direct database calls from route handlers.

## Context

The workshop feature needed to add `ActivityEvent` writes when cards move and expose board-scoped activity endpoints. The original routes mixed HTTP concerns, authorization checks, and Prisma queries in the same files, which made the activity feature harder to test and triggered the repository-layer scoring check.

## Rationale

Keeping Prisma access in `src/repositories/taskflow.ts` makes route handlers smaller and easier to exercise with HTTP-level tests. The move operation remains atomic because the repository owns the transaction that updates the card and creates the activity event together.

## Consequences

The route layer now depends on named repository functions, and tests can replace that repository with an in-memory implementation. Existing legacy behavior is mostly preserved, but remaining authorization and response-shaping issues are still tracked in `OBSERVATIONS.md`.
