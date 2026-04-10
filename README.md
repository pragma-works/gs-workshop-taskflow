# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## Activity feed implementation

This branch adds a board activity feed for card moves. The Prisma schema now includes
`ActivityEvent`, which records the board, actor, card, source list, destination list,
event type, and creation time for feed entries.

Implemented endpoints:

- `PATCH /cards/:id/move` moves a card and creates a `card_moved` activity event in one transaction.
- `GET /boards/:id/activity` returns authenticated board activity in reverse chronological order.
- `GET /boards/:id/activity/preview` returns the same activity shape without auth for workshop testing.

Activity responses include display fields for the UI: `actorName`, `cardTitle`,
`fromListName`, and `toListName`. Route handlers delegate database work to a repository
module so the HTTP layer stays focused on request parsing and responses.

The activity feed behavior is covered by Vitest/Supertest route specs, including
unauthenticated access, successful move logging, reverse chronological ordering, and
rollback behavior when a move cannot be completed.

Additional cleanup applied after the feature:

- User responses omit password hashes.
- Board membership is enforced before reading, creating, moving, commenting on, or deleting cards.
- Only board owners can add members.
- Comments create `comment_created` activity events.
- Shared auth and repository functions keep route handlers focused on HTTP behavior.

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
