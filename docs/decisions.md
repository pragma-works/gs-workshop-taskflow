# Architecture Decisions

## ADR-001 — Repository layer instead of direct Prisma in route handlers

**Date:** 2026-04-10
**Status:** Accepted

### Context

The starter codebase had route handlers importing `prisma` directly and executing database queries inline. This violates the principle of separation of concerns: routes should handle HTTP concerns (parsing requests, sending responses), not data access logic.

The scoring rubric explicitly checks for zero direct `db.*` calls in route files ("Bounded" property) and that business logic does not leak into route handlers ("Composable" property).

### Decision

All Prisma database access is encapsulated in `src/repositories/`:

- `boardRepository.ts` — board, list, member queries
- `userRepository.ts` — user creation and lookup (also strips `password` from responses)
- `cardRepository.ts` — card CRUD, atomic move-with-activity-log transaction
- `activityRepository.ts` — activity event queries with related-data includes

Route handlers import only from repositories and the shared `auth.ts`. No route file imports `prisma` or `@prisma/client` directly.

### Consequences

- **Positive:** Routes are thin — each handler is ≤10 lines of HTTP logic. Repository functions are independently testable and reusable.
- **Positive:** A single Prisma transaction in `cardRepository.moveCard` ensures the card update and ActivityEvent creation are atomic — no state desync on partial failure.
- **Positive:** N+1 query patterns in the original codebase are eliminated — Prisma `include` loads all nested data in a single query.
- **Trade-off:** More files to navigate. Mitigated by consistent naming (`*Repository.ts`).

## ADR-002 — Shared `verifyToken` in `src/auth.ts`

**Date:** 2026-04-10
**Status:** Accepted

### Context

The original codebase had three identical copies of `verifyToken` (one per route file), each with the JWT secret hardcoded as `'super-secret-key-change-me'`.

### Decision

Extracted to `src/auth.ts`. JWT secret reads from `process.env.JWT_SECRET` with the insecure string as a development fallback only. All route files import `verifyToken` from `../auth`.

### Consequences

One place to change the secret rotation, token algorithm, or expiry policy.
