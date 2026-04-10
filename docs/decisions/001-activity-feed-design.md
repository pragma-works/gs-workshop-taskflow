# ADR-001: Activity Feed Design

## Status

Accepted

## Context

The Kanban board API needs an activity feed that tracks card movements between lists (PM-5214). The existing codebase has several anti-patterns:

- **Non-atomic card moves**: card update and activity logging are separate writes with no transaction, risking state desync
- **N+1 queries**: board detail and card detail endpoints issue O(N*M) queries via nested loops
- **Copy-pasted authentication**: `verifyToken` is duplicated identically in 3 route files with a hardcoded JWT secret
- **Direct database access in routes**: all route handlers call Prisma directly, coupling business logic to the ORM

## Decision

1. **ActivityEvent model**: Created a new Prisma model with foreign key relations to Board, User, Card, and List (named relations `fromList`/`toList`) to record card movements with full context.

2. **Transactional moves**: Card update and ActivityEvent creation happen inside a single `prisma.$transaction()` call. Either both succeed or neither does — no desync possible.

3. **Repository layer**: Extracted all database operations into `src/repositories/` (userRepo, boardRepo, cardRepo, activityRepo). Route handlers import only repository functions — zero direct Prisma calls in routes.

4. **Shared auth middleware**: Extracted `verifyToken` and `signToken` to `src/middleware/auth.ts`. JWT secret reads from `process.env.JWT_SECRET` with a fallback default.

5. **Single-query data loading**: Replaced N+1 loops with Prisma `include` for nested relations (board → lists → cards → comments + labels, activity → actor + card + fromList + toList).

## Consequences

- Route handlers are thin controllers that delegate to repository functions (composable, bounded)
- Card moves are atomic — the activity log is always consistent with the card state
- Board detail endpoint goes from O(N*M) queries to 1 query
- Activity feed returns enriched events (actorName, cardTitle, listNames) in at most 2 queries
- Password hashes are no longer returned in user API responses
