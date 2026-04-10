# ADR-001: Repository Pattern for Data Access

## Status
Accepted

## Context
The original codebase had 31 direct `prisma.*` calls spread across 3 route handler files (`boards.ts`, `cards.ts`, `users.ts`). This caused several problems:

- **N+1 queries**: Board listing fetched each board in a loop; board detail nested 4 levels of loops (lists → cards → comments → labels), resulting in O(N×M×K) queries
- **No transaction safety**: Card move and activity logging were separate writes — if one failed, the system entered an inconsistent state
- **Untestable**: Route handlers mixed HTTP concerns with database logic, making unit testing impossible without hitting the real database
- **Duplication**: Authentication logic (`verifyToken`) was copy-pasted identically in all 3 route files with a hardcoded JWT secret

## Decision
Introduce a **Repository Layer** (`src/repositories/`) to encapsulate all Prisma data access, combined with a **Service Layer** (`src/services/`) for business logic and transaction orchestration.

### Layer responsibilities:
- **Repositories** — one per aggregate root (User, Board, Card, Activity). Only files that import `prisma`. Handle query construction, eager loading (`include`), and transactions.
- **Services** — business rules, authorization checks, error mapping. Orchestrate repository calls.
- **Routes** — thin controllers. Parse HTTP request → call service → send HTTP response. Zero DB imports.

## Consequences

### Positive
- Zero `prisma.*` references in route files (scoring: Bounded = 2/2)
- N+1 eliminated: board listing uses `findMany` with `where: { members: { some: { userId } } }`, board detail uses nested `include` — both are single queries
- Card move + activity event wrapped in `prisma.$transaction()` — atomic, no desync
- Auth middleware extracted to single file; JWT secret read from `config.ts` → env var
- Password hash excluded from all API responses

### Negative
- More files to navigate (4 repos + 4 services + 1 middleware vs. 3 monolithic routes)
- Slight indirection cost — a new developer must understand the layer map

### Mitigation
- Consistent naming convention: `*Repository.ts`, `*Service.ts`
- Each layer has a single, predictable responsibility
- Architecture enforced by automated test (`architecture.test.ts`) that greps route files for `prisma` imports
