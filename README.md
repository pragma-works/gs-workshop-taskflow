# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

## What was built for PM-5214

This project now includes an **Activity Feed** for board-level auditing and smoke testing.
The implementation adds persisted activity events for card moves and new comments, exposes
board activity endpoints, and refactors the application so route handlers stay thin while
services and repositories own the business and persistence logic.

### New behavior

- `GET /boards/:id/activity` returns board activity events newest-first for authenticated members
- `GET /boards/:id/activity/preview` returns the last 10 events without auth for quick smoke checks
- `PATCH /cards/:id/move` now writes a `card_moved` activity event atomically and returns the updated card
- `POST /cards/:id/comments` now writes a `comment_added` activity event atomically
- JWT signing and verification now use `JWT_SECRET` from the environment instead of hardcoded secrets
- User endpoints no longer expose password hashes in responses

### Architecture changes

- `src/routes` is now an HTTP adapter layer that delegates to services
- `src/services` contains the application use cases and authorization checks
- `src/repositories` is the only layer that talks to Prisma directly
- `src/app.ts` is the composition root that wires repositories, services, and routers together
- Activity event metadata is stored as serialized JSON text because this Prisma + SQLite setup
  does not support a native `Json` column type

### Verification surface

The project now has API-level tests with Supertest + Vitest that exercise users, boards, cards,
and activity endpoints against a seeded SQLite database. The current line coverage is above the
workshop threshold for the automated **Verifiable** score.

---

## Your instructions are in START.md

Open `START.md` — it has your task brief (PM-5214), scoring rubric, and step-by-step instructions for your group.

---

## Setup

```bash
npm install
npm run db:push   # creates the SQLite database
npm run db:seed   # loads demo users and boards
npm run dev       # starts on http://localhost:3001
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
