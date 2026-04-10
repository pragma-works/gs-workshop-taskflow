# Design Decisions — taskflow Activity Feed

## ADR-001: Repository Layer for Database Access

**Date:** 2026-04-10
**Status:** Accepted

### Context
The original codebase had direct `prisma.*` calls scattered throughout route handlers. This created tight coupling between HTTP concerns and data access, made testing harder, and duplicated logic.

### Decision
Introduce a `src/repositories/` layer. Each domain (boards, cards, users, activity) has its own `.repo.ts` file that owns all Prisma calls. Route handlers only call repository functions.

### Consequences
- Route files contain zero direct `prisma.*` calls → passes Bounded scoring criterion
- Repository functions are independently testable via mocking
- Single place to fix N+1 queries (e.g., `findBoardWithLists` uses nested `include` instead of loops)

---

## ADR-002: Atomic Card Move via Prisma Transaction

**Date:** 2026-04-10
**Status:** Accepted

### Context
`PATCH /cards/:id/move` originally performed two separate writes: update the card's `listId`, then log activity. A crash between the two left the database in an inconsistent state (card moved, no activity log).

### Decision
Use `prisma.$transaction([...])` to batch the card update and `ActivityEvent` creation into a single atomic operation. If either write fails, both are rolled back.

### Consequences
- No more split-brain state between card position and activity log
- Response now includes the created `ActivityEvent` object
- Error handling catches transaction failures and returns `{ error: "Move failed" }`

---

## ADR-003: Shared JWT Secret via Environment Variable

**Date:** 2026-04-10
**Status:** Accepted

### Context
The JWT secret `'super-secret-key-change-me'` was hardcoded identically in three route files. Any rotation required three file edits and a deploy.

### Decision
Extract to `src/lib/auth.ts` which reads `process.env.JWT_SECRET` (with the original string as a dev fallback). All route files import `verifyToken` and `JWT_SECRET` from this single module.

### Consequences
- Secret rotation requires only an env var change
- Single `verifyToken` implementation — no drift between copies
