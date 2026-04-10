# ADR-001: Activity Feed architecture and persistence

## Status

Accepted

## Context

PM-5214 required a board-level Activity Feed plus changes in existing card endpoints so moves and
comments become auditable events. The starting codebase had three constraints that made a direct
route-level implementation risky:

1. Route handlers contained business logic and direct Prisma calls
2. JWT verification was duplicated with a hardcoded secret
3. Card moves and activity logging were not atomic

The workshop scoring also rewards a repository boundary and penalizes direct persistence calls
outside that layer.

## Decision

We implemented the Activity Feed with a **routes -> services -> repositories** split:

- `src/routes` handles HTTP only
- `src/services` owns authorization, validation, and use-case orchestration
- `src/repositories` owns all Prisma access
- `src/app.ts` wires dependencies as the composition root

We added an `ActivityEvent` table with:

- `boardId`
- `cardId` (optional)
- `userId`
- `action`
- `meta`
- `createdAt`

`meta` is stored as a serialized JSON string instead of a Prisma `Json` column because the
current Prisma + SQLite connector in this project does not support `Json` for this datasource.
Repositories serialize on write and parse on read so the HTTP contract still exposes `meta` as an
object.

We also made activity writes transactional:

- `PATCH /cards/:id/move` updates the card and inserts `card_moved` in one transaction
- `POST /cards/:id/comments` inserts the comment and `comment_added` in one transaction

## Consequences

### Positive

- Board activity is queryable and auditable
- Route handlers are thin and easier to reason about
- Direct Prisma access is isolated in one layer
- Move/comment operations cannot leave card state and activity state out of sync
- The preview endpoint can stay public without weakening the authenticated board feed

### Trade-offs

- The codebase has more files and explicit wiring than the starting point
- Activity metadata needs parse/stringify handling in repositories
- API tests take longer because they reset and reseed SQLite for each case
