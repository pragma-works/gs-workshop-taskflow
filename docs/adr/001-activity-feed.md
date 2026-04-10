# ADR 001: Activity Feed Architecture

## Status
Accepted

## Context
PM-5214 requires an activity feed that logs card movements and comments on a board. The existing codebase had all database calls directly in route handlers with no layering.

## Decisions

### 1. Repository + Service layers
Introduced `src/repositories/` for all database access and `src/services/` for business logic. Routes are now thin HTTP adapters that parse requests and delegate to services.

**Why:** Clean separation of concerns. The repository layer encapsulates all database operations, making it possible to change the ORM or database without touching business logic or routes.

### 2. Atomic card move + activity event
The card move operation and its corresponding ActivityEvent are wrapped in a single `prisma.$transaction()` inside `card.repository.ts`.

**Why:** Without a transaction, a crash between the card update and the activity log write would leave the database in an inconsistent state (card moved but no record of the move).

### 3. ActivityEvent meta stored as JSON string
The `meta` field is a nullable string containing JSON (e.g., `{"fromListId":1,"toListId":2}`). We chose a string over structured columns because the meta shape varies by action type and SQLite has no native JSON column type in Prisma.

### 4. Preview endpoint without auth
`GET /boards/:id/activity/preview` has no authentication requirement, as specified in the ticket for smoke testing purposes. It is limited to the last 10 events.

## Consequences
- All route files have zero direct database calls
- Transaction guarantees consistency between card state and activity log
- Adding new activity event types only requires changes in services and repositories
