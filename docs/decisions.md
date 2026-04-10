# Decision Log

## ADR-001: Repository layer for all persistence (2026-04-10)

**Context:** The starter codebase had direct `prisma.*` calls scattered across three route files (`boards.ts`, `cards.ts`, `users.ts`). This violated the Bounded scoring property and made it impossible to test business logic without a real database.

**Decision:** Introduce a thin repository layer (`src/repositories/`) that owns all `prisma.*` calls. Routes import only repository functions — never `prisma` directly.

**Consequences:**
- Routes become pure HTTP adapters (parse request, call repo, return response)
- Repositories can be mocked in unit tests without supertest / real DB
- A single place to add caching, soft-delete, or audit logging later
- Slightly more files, but each is short and single-purpose

---

## ADR-002: Atomic ActivityEvent writes via transactions (2026-04-10)

**Context:** The original `PATCH /cards/:id/move` performed two separate writes: a card update and a console.log placeholder. If the second write had been real and failed, the card position and the activity log would have been out of sync.

**Decision:** Use `prisma.$transaction` in `cardRepository.moveCard` and `cardRepository.addComment` so the domain action and its ActivityEvent are committed together or both rolled back.

**Alternatives rejected:**
- Two separate awaits (rejected — leaves window for desync)
- Saga/outbox pattern (rejected — overkill for SQLite in a workshop context)

---

## ADR-003: Centralised JWT middleware (2026-04-10)

**Context:** `verifyToken` was copy-pasted identically into `boards.ts`, `cards.ts`, and `users.ts` with a hardcoded secret (`'super-secret-key-change-me'`).

**Decision:** Extract to `src/middleware/auth.ts`. Read the secret from `process.env.JWT_SECRET` with the hardcoded string as a development fallback (never deployed to production without the env var set).

**Consequences:** Single change point for auth logic; secret rotation requires only an env var update.
