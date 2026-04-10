# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## What was built

This session implemented the **activity feed** feature (PM-5214) and fixed several pre-existing anti-patterns:

### New feature: Activity Feed
- `ActivityEvent` model added to the schema (boardId, actorId, eventType, cardId, fromListId, toListId)
- `PATCH /cards/:id/move` now atomically updates the card **and** creates an `ActivityEvent` in a single Prisma transaction — no more split-brain state
- `GET /boards/:id/activity` — authenticated endpoint returning all activity for a board in reverse chronological order, with actor name, card title, and list names resolved
- `GET /boards/:id/activity/preview` — unauthenticated version for testing

### Anti-patterns fixed
| Anti-pattern | Fix |
|---|---|
| JWT secret hardcoded in 3 files | Moved to `process.env.JWT_SECRET` via `src/lib/auth.ts` |
| `PATCH /cards/:id/move` — no transaction | Rewritten with `prisma.$transaction` |
| `GET /boards/:id` — N+1 queries | Replaced with single Prisma `include` query |
| No global error handler | Express error middleware added to `src/index.ts` |
| Passwords returned in user responses | `password` field stripped before sending |

### Architecture
- `src/repositories/` — all Prisma calls isolated here (one file per domain)
- `src/lib/auth.ts` — shared `verifyToken` using env var secret
- Route handlers contain no direct DB calls

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

## What good looks like

- Cards belong to columns; columns belong to boards — correct ownership enforced
- Moving a card to Done does not delete it
- Comments are attached to cards, not boards
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test