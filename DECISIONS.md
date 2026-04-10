# Decision Log — Activity Feed (PM-5214)

## Decision 1: Repository layer for all persistence

**Context:** The existing codebase had direct `prisma.*` calls scattered across all route handlers, making them hard to test and tightly coupled to the ORM.

**Decision:** Introduce a `src/repositories/` layer with dedicated modules (`boardRepository`, `cardRepository`, `userRepository`, `activityRepository`). All database access goes through these modules.

**Rationale:**
- Satisfies the "Bounded" scoring criterion (zero `prisma.*` in route files)
- Enables the "Composable" property — routes only translate HTTP, business logic lives in repositories
- Makes it trivial to swap persistence layer or mock for tests
- Naturally consolidates the duplicated `checkMember` helper

## Decision 2: Shared auth middleware with env-based JWT secret

**Context:** `verifyToken` was copy-pasted identically in 3 route files, each with a hardcoded JWT secret string.

**Decision:** Extract to `src/middleware/auth.ts`, read `JWT_SECRET` from `process.env.JWT_SECRET` with a fallback for development.

**Rationale:**
- Single source of truth for auth logic
- Secret rotation requires zero code changes
- Required `dotenv` package since Prisma's internal `.env` loading doesn't populate `process.env` for app code

## Decision 3: `meta` as a JSON string column instead of explicit fromListId/toListId columns

**Context:** The PM ticket response shape uses `meta?` as an optional field. We could either add explicit columns for `fromListId` and `toListId`, or use a flexible JSON string.

**Decision:** Use a single `meta` column (`String?`) storing JSON like `{"fromListId": 1, "toListId": 2}`.

**Rationale:**
- Matches the PM ticket response shape directly
- Extensible — future event types can store different metadata without schema migrations
- Trade-off: no foreign key enforcement on list IDs inside meta, but activity events are append-only logs where referential integrity is less critical

## Decision 4: Prisma `$transaction` for atomic activity logging

**Context:** The original card move was two separate writes — if the second failed, the card would move but no activity event would be created.

**Decision:** Wrap card update + activity event creation in `prisma.$transaction()` in the repository layer.

**Rationale:**
- Guarantees atomicity — either both succeed or both roll back
- The transaction lives in the repository, not the route handler, keeping routes thin
- Same pattern applied to comment creation for consistency
