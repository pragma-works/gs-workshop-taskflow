# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## What we built

### Activity Feed (PM-5214)

We implemented a full **activity feed** feature on top of the existing Kanban API:

- **`ActivityEvent` model** — Added to `prisma/schema.prisma` with relations to Board, User, Card, and List. Tracks who moved what card, from which list, to which list, and when.
- **`PATCH /cards/:id/move` rewrite** — Card moves now happen inside a Prisma `$transaction`, atomically updating the card's list and creating an `ActivityEvent` in a single operation. If either write fails, both roll back — no orphaned state.
- **`GET /boards/:id/activity`** — Authenticated endpoint returning all activity events for a board in reverse chronological order, enriched with `actorName`, `cardTitle`, `fromListName`, and `toListName`. Uses Prisma `include` to avoid N+1 queries (max 2 queries total).
- **`GET /boards/:id/activity/preview`** — Same response shape but without authentication, for testing and demos.
- **Integration tests** — 5 Vitest tests covering: 401 on missing auth, 403 for non-members, transactional card move with event creation, 404 rollback on invalid target list, and reverse chronological ordering on the preview endpoint.

### Anti-patterns addressed
- **No transaction on card move** → Fixed: Prisma `$transaction` wraps both writes
- **No activity logging** → Fixed: `ActivityEvent` created atomically with every move
- **N+1 on activity queries** → Avoided: single query with `include` for all relations
- **Target list validation missing** → Fixed: 404 returned before transaction if list doesn't exist

### Anti-patterns still present (known debt)
- JWT secret hardcoded across 4 files (should come from `process.env.JWT_SECRET`)
- `verifyToken()` duplicated in users.ts, boards.ts, cards.ts, activity.ts
- Password hash exposed in `/users/register` and `GET /users/:id` responses
- N+1 queries remain in `GET /boards/:id` and `GET /cards/:id` for labels
- No ownership check on `DELETE /cards/:id` or `POST /boards/:id/members`

---

## Your instructions are in START.md

Open `START.md` — it has your task brief (PM-5214), scoring rubric, and step-by-step instructions for your group.

---

## Setup

```bash
npm install
npm run db:push   # creates the SQLite database
npm run dev       # starts on http://localhost:3000
npm test          # run tests
```

---

## How scoring works

Every time you push to your `participant/PXXX` branch, a GitHub Actions workflow runs automatically:

1. Checks out your code
2. Runs `npm run score` — a scoring script that analyses your repo against 7 code quality properties
3. Writes the result to `score.json` on your branch (committed by the bot)
4. Uploads it as a workflow artifact

**You never need to run scoring manually.** Push your code → wait ~60s → check the Actions tab.

The score is re-computed on every push, so the latest push always reflects your current state.

---

## What gets scored (automated, 8 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass hidden live tests (HTTP status codes, response shapes) |
| **Composable** | 3 | Business logic does not leak into route handlers (hidden live test) |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.*` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits + one decision log entry |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |

Executable and Composable are scored via hidden live tests after the session. The other 8 points are computed automatically on every push and visible in your `score.json`.

---

## Scoring is blind

`score.ts` receives no information about which experimental condition you are in — it analyses whatever code is on your branch. This makes the experiment inherently double-blind by design.

---

## What good looks like

- Cards belong to columns; columns belong to boards — correct ownership enforced
- Moving a card to Done does not delete it
- Comments are attached to cards, not boards
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test