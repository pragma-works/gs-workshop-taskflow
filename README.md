# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

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

## Group B Activity Feed

This branch now includes an **Activity Feed** for board-level actions.

- `GET /boards/:id/activity` returns board events in reverse chronological order for authenticated board members
- `GET /boards/:id/activity/preview` returns the latest 10 events without authentication for smoke testing
- `POST /cards/:id/move` records a `card_moved` event atomically with the card move
- `POST /cards/:id/comments` records a `comment_added` event when a new comment is created

The implementation also removes direct Prisma access from route handlers, centralizes JWT handling, and adds tests for the corrected baseline plus the new activity endpoints.

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
