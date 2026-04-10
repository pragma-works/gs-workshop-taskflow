# Task Brief — PM-5214: Activity Feed

## Overview

Add an **activity feed** to the Kanban board API. When cards move between columns, the system should log the event and make it queryable. This gives teams visibility into what changed, when, and by whom.

---

## What you're building

1. **ActivityEvent data model** — a new Prisma model that records card movements with references to the board, actor, card, source list, and target list.
2. **Atomic card moves** — rewrite `PATCH /cards/:id/move` to update the card and log the event in a single database transaction (no state desync).
3. **Activity feed endpoints**:
   - `GET /boards/:id/activity` — authenticated; returns all events for a board in reverse chronological order with actor name, card title, and list names.
   - `GET /boards/:id/activity/preview` — no auth required; same response shape, for testing convenience.
4. **Tests** — cover authentication, transaction behavior, ordering, and error edge cases.

---

## Scoring Rubric (14 pts total)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass hidden live tests (HTTP status codes, response shapes) |
| **Composable** | 3 | Business logic does not leak into route handlers (hidden live test) |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `prisma.*` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits + one decision log entry |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |

---

## Step-by-step Instructions

### Step 1 — Analyze the codebase (no code changes)

Read `src/` and `prisma/schema.prisma`. Identify:
- All entities and relationships (User, Board, BoardMember, List, Card, Label, CardLabel, Comment)
- Every implemented endpoint (users CRUD, boards CRUD, cards CRUD)
- Anti-patterns: N+1 queries, copy-pasted `verifyToken`, hardcoded JWT secret, missing transactions, password hash leaked in responses
- What's missing for the feature: ActivityEvent model, activity feed routes, transaction in card move

### Step 2 — Extend the schema

Add an `ActivityEvent` model to `prisma/schema.prisma`:
- Fields: `id`, `boardId`, `actorId`, `eventType` (string), `cardId` (nullable), `fromListId` (nullable), `toListId` (nullable), `createdAt`
- Add foreign key relations to Board, User, Card, List (with named relations for fromList/toList)
- Add back-relations to existing models
- Run `npx prisma db push` to apply

### Step 3 — Rewrite card move with transaction

Rewrite `PATCH /cards/:id/move` in `src/routes/cards.ts`:
- Accept body: `{ targetListId: number, position: number }`
- Verify the caller is authenticated (use `verifyToken`)
- In a single Prisma transaction:
  1. Update the card's `listId` and `position`
  2. Create an `ActivityEvent` with eventType `"card_moved"`, cardId, fromListId, toListId, actorId, boardId
- If the transaction fails, return 500 with `{ error: "Move failed", details: <message> }`
- Return `{ ok: true, event: <the created ActivityEvent> }` on success

### Step 4 — Implement activity feed endpoints

Implement in `src/routes/activity.ts`:
- `GET /boards/:id/activity` — authenticated; returns all `ActivityEvent`s for the board in reverse chronological order; each event includes `actorName`, `cardTitle` (nullable), `fromListName` (nullable), `toListName` (nullable)
- `GET /boards/:id/activity/preview` — no auth required; same response shape
- Use Prisma `include` — no N+1 queries (≤2 queries per endpoint)
- Wire the router into `src/index.ts` at path `/boards`

### Step 5 — Write tests

Create `src/routes/activity.test.ts` (Vitest + supertest):
1. Unauthenticated request to `GET /boards/:id/activity` returns 401
2. `PATCH /cards/:id/move` creates an ActivityEvent in the same transaction
3. `GET /boards/:id/activity/preview` returns events in reverse chronological order
4. Moving a card to a non-existent list returns 404

### Bonus — Architecture improvements (for higher scores)

- Extract `verifyToken` to a shared auth middleware (`src/middleware/auth.ts`) — eliminates copy-paste across 3 files
- Extract all database calls to a repository layer (`src/repositories/`) — eliminates `prisma` from routes (bounded)
- Use `process.env.JWT_SECRET` instead of hardcoded secret string
- Fix N+1 queries with Prisma `include` (boards detail, card detail)
- Add a decision log document (`docs/decisions/`)
- Update `README.md` to describe the activity feed feature
