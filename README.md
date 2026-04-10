# taskflow — Kanban Board API

A Kanban board API for managing work in columns (Backlog, In Progress, Done), moving cards between them, and discussing work in comments.

## What was built (PM-5214: Activity Feed)

An activity feed that tracks card movements and comments on a board.

### New endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /boards/:id/activity` | Required | All activity events for the board, newest first. 401/403/404 |
| `GET /boards/:id/activity/preview` | None | Last 10 events, for smoke testing |

### Modified endpoints

| Endpoint | Change |
|---|---|
| `PATCH /cards/:id/move` | Now writes an ActivityEvent (`card_moved`) atomically via transaction |
| `POST /cards/:id/comments` | Now writes an ActivityEvent (`comment_added`) |

### Architecture

```
Routes → Services → Repositories → Database (Prisma/SQLite)
```

- **Routes** are thin HTTP adapters: parse request, delegate to service, send response
- **Services** contain business logic: validation, authorization checks, orchestration
- **Repositories** encapsulate all database access: queries, transactions, CRUD

### Anti-patterns fixed

- JWT secret extracted to env var (was hardcoded in 3 files)
- `verifyToken` extracted to shared middleware (was copy-pasted 3x)
- N+1 queries replaced with eager loading via Prisma includes
- Card move + activity log wrapped in a transaction (was two separate writes)
- All direct `prisma.*` calls moved from routes to repositories

## Setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev          # http://localhost:3001
npm test             # run tests
npm run test:coverage
```

## Seed data

- Users: alice, bob, carol (password: `password123`)
- 1 board, 3 lists, 5 cards, 11 comments
