# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## What was built

This session implemented the **Activity Feed** feature and refactored the existing codebase to address known anti-patterns:

### New feature: Activity Feed
- `GET /boards/:id/activity` — returns all activity events for a board in reverse chronological order (requires auth)
- `GET /boards/:id/activity/preview` — same response, no auth required (for testing)
- Card moves (`PATCH /cards/:id/move`) now atomically record an `ActivityEvent` in the same database transaction

### Refactoring applied
| Anti-pattern | Fix |
|---|---|
| `verifyToken` duplicated in 3 files | Extracted to `src/middleware/auth.ts` as Express middleware |
| Direct `prisma.*` calls in route handlers | Moved to `src/repositories/` (one file per entity) |
| Hardcoded JWT secret | Reads from `process.env.JWT_SECRET` |
| `password` field returned in API responses | Omitted at repository level |
| No ownership check before adding members / deleting cards | `isBoardOwner` / `isBoardMember` checks added |
| N+1 queries | Replaced with Prisma `include` (single query per operation) |
| Card move without transaction | Wrapped in `prisma.$transaction` |
| No global error handler | Added to `src/index.ts` |
| No input validation | Added with `zod` on all mutating endpoints |

### Architecture decision
See [`docs/decisions/adr-001-repository-layer.md`](docs/decisions/adr-001-repository-layer.md) for the rationale behind the repository pattern.

---

## Setup

```bash
npm install
npm run db:push   # creates the SQLite database
npm run dev       # starts on http://localhost:3001
npm test          # run tests
```

### Environment variables

Copy `.env.example` to `.env` and set a real JWT secret:

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
PORT=3001
```

---

## API Overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/users/register` | — | Register a new user |
| POST | `/users/login` | — | Login, returns JWT |
| GET | `/users/:id` | ✓ | Get user by ID |
| GET | `/boards` | ✓ | List boards for current user |
| GET | `/boards/:id` | ✓ | Full board with lists, cards, comments |
| POST | `/boards` | ✓ | Create a board |
| POST | `/boards/:id/members` | ✓ owner | Add a member to a board |
| GET | `/boards/:id/activity` | ✓ | Activity feed for a board |
| GET | `/boards/:id/activity/preview` | — | Activity feed (no auth, for testing) |
| GET | `/cards/:id` | ✓ | Get card with comments and labels |
| POST | `/cards` | ✓ | Create a card |
| PATCH | `/cards/:id/move` | ✓ | Move card to a different list |
| POST | `/cards/:id/comments` | ✓ | Add a comment to a card |
| DELETE | `/cards/:id` | ✓ member | Delete a card |

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