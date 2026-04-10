# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## Your instructions are in START.md

Open `START.md` — it has your task brief (PM-5214), scoring rubric, and step-by-step instructions for your group.

---

## Implemented in this repo (PM-5214)

This workspace now includes an Activity Feed implementation with layered architecture:

- `GET /boards/:id/activity` (auth required)
	- Returns `{ events: [...] }` newest-first
	- `401` unauthenticated
	- `403` authenticated but not a board member
	- `404` board not found
- `GET /boards/:id/activity/preview` (public)
	- Same response shape as above
	- Limited to 10 latest events
- `POST /cards/:id/move`
	- Moves card and writes `card_moved` activity event atomically in one transaction
- `POST /cards/:id/comments`
	- Creates comment and writes `comment_added` activity event atomically in one transaction

Additional refactors included:

- Route handlers are thin and no longer perform direct Prisma calls.
- Shared auth moved to middleware using `JWT_SECRET` from environment configuration.
- N+1-heavy board detail loading replaced by include-based repository query.
- User responses no longer expose password hashes.

### Quick manual check

1. Login:
	 - `POST /users/login` with seeded credentials (for example `alice@test.com` / `password123`)
2. Use token as `Authorization: Bearer <token>`
3. Move a card and add a comment
4. Read activity:
	 - `GET /boards/:id/activity`
	 - `GET /boards/:id/activity/preview`

### Browser UI for manual testing

You can now test Taskflow directly from a browser UI served by the same API process:

1. Run `npm run dev`
2. Open `http://localhost:3001`
3. Use seeded credentials (`alice@test.com` / `password123`)
4. Load boards, select a board ID, then test:
	- board detail
	- private/public activity feed
	- move card
	- add comment

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