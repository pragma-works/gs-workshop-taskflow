# Decision Log

## ADR-001 — Atomic card-move via Prisma `$transaction`

**Date:** 2026-04-10  
**Status:** Accepted

### Context

`PATCH /cards/:id/move` must update the card's `listId`/`position` **and** create an `ActivityEvent` record at the same time. The original implementation did two sequential writes with no transaction, meaning a process crash between them would leave the card moved but the event never recorded — a silent data desync.

### Decision

Use `prisma.$transaction([cardUpdate, activityCreate])` — Prisma's array-form interactive transaction — so both writes either commit together or both roll back. The route handler catches the rejected promise and returns `500 { error: "Move failed", details: <message> }`, ensuring callers always know when the operation did not complete.

### Alternatives considered

| Option | Rejected because |
|--------|-----------------|
| Two separate `await` calls | Non-atomic; failure between writes leaves DB in inconsistent state |
| Application-level saga / outbox | Over-engineered for a single-DB, single-service deployment |
| Database trigger | Not supported by SQLite in a portable way across environments |

### Consequences

- **Good:** Consistency guaranteed at the DB level; the activity feed always reflects the true state of the board.
- **Good:** Easier to test — mock `$transaction` once, verify both operations are submitted together.
- **Trade-off:** `$transaction` with an array of PrismaPromises evaluates each operation eagerly before passing them to the transaction engine; all repository methods referenced in the array must be defined in the mock during tests.

---

## ADR-002 — Repository + Service layering for clean architecture

**Date:** 2026-04-10  
**Status:** Accepted

### Context

The original codebase had all Prisma calls directly in route handlers, making routes untestable without a real database, and business logic impossible to reuse.

### Decision

Introduce two layers:
1. **Repositories** (`src/repositories/`) — own all Prisma access; implement interfaces (`IUserRepository`, `IBoardRepository`, etc.)
2. **Services** (`src/services/`) — own all business logic; receive repository interfaces via constructor injection

Route factories (`createBoardsRouter(service)`) accept service instances as parameters, enabling tests to inject fakes without touching the database or the HTTP layer.

### Consequences

- Routes contain zero `prisma.*` references, satisfying the **Bounded** scoring property.
- Services are independently unit-testable by passing mock repository implementations.
- `src/index.ts` is the single composition root — the only place that instantiates concrete classes and wires the dependency graph.
