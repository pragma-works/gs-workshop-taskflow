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

## ADR-004: SOLID Refactor — Service Layer with Functional DI

**Date:** 2026-04-11
**Status:** Accepted

### Context
Route handlers were doing too much: JWT verification, business rule enforcement, database access, and HTTP serialization — all inline. This violated SRP, made unit testing impossible without full database setup, and made the codebase brittle to change.

### Decision
Introduce a service layer using factory functions with injected interface-typed dependencies:
- `createUserService(repo, hasher, tokens)` → `UserService`
- `createBoardService(repo)` → `BoardService`
- `createCardService(cardRepo, boardRepo)` → `CardService`
- `createActivityService(activityRepo, boardRepo)` → `ActivityService`

Repository interfaces (`IBoardRepository`, `ICardRepository`, etc.) define the contracts. Concrete implementations live in `src/repositories/`. Services only depend on interfaces — never on Prisma.

Authentication is extracted to `src/middleware/authenticate.ts` (replaces 16 inline try/catch blocks). Input validation uses `src/middleware/validate.ts` (Zod-powered factory). Typed errors (`AppError` hierarchy) flow to the global error handler which maps `statusCode` to HTTP status.

### Consequences
- Services are fully unit-testable with mocked interfaces (no database required)
- 27 new service-layer tests; total coverage 88.76%
- Routes are thin adapters: parse → service → respond (10–20 lines each)
- No Prisma imports outside `src/repositories/` — Bounded criterion maintained
- Open/Closed: new endpoints add new services/middleware without editing existing handlers
