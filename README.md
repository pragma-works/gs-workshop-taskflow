# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## What Was Built (PM-5214: Activity Feed)

An **Activity Feed** for the Kanban board. Every card move and comment is now recorded as an
`ActivityEvent` and exposed via two new endpoints:

- `GET /boards/:id/activity` — full activity feed, newest first (auth required, members only)
- `GET /boards/:id/activity/preview` — last 10 events, no auth (smoke-testing friendly)

Activity events are written **atomically** (in a transaction) alongside the triggering action
so the board state and activity log are never out of sync.

### Fixes applied

| File | Fix |
|------|-----|
| `src/routes/boards.ts` | Replaced direct `prisma.*` with `boardRepository`, eliminated N+1 queries |
| `src/routes/cards.ts` | Replaced direct `prisma.*` with `cardRepository`, added transactions |
| `src/routes/users.ts` | Replaced direct `prisma.*` with `userRepository`, password no longer returned |
| `src/middleware/auth.ts` | Centralised JWT verification; secret read from `JWT_SECRET` env var |

---

## Setup

```bash
npm install
npm run db:push   # creates the SQLite database
npm run db:seed   # loads test users and boards
npm run dev       # starts on http://localhost:3001
npm test          # run tests
```

---

## Architecture

```
[Routes] → [Repositories] → [Prisma / SQLite]
         ↗
[Middleware/auth]
```

Routes contain no business logic and make **zero direct `prisma.*` calls**.
All persistence is behind the repository layer in `src/repositories/`.

---