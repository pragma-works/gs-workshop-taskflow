# Taskflow — Kanban Board API

A Kanban board API for managing work in columns (Backlog, In Progress, Done),
moving cards between them, tracking activity, and discussing work in comments.

## Architecture

Clean layered architecture following SOLID principles:

```
Routes (thin controllers) → Services (business logic) → Repositories (data access) → Prisma/SQLite
                ↕                       ↕
         Auth Middleware             Config
```

- **Routes** — parse request, delegate to service, send response. Zero DB access.
- **Services** — business rules, transaction orchestration, authorization checks.
- **Repositories** — all Prisma queries encapsulated per aggregate root.
- **Middleware** — centralized JWT auth + global error handler.

## Activity Feed (PM-5214)

New feature: chronological log of card movements and comments on a board.

### New Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/boards/:id/activity` | Required | All activity events for a board, newest-first |
| `GET` | `/boards/:id/activity/preview` | None | Last 10 events (smoke testing) |

### Response Shape
```json
{
  "events": [
    {
      "id": 1,
      "boardId": 1,
      "cardId": 3,
      "userId": 1,
      "action": "card_moved",
      "meta": "{\"fromListId\":1,\"toListId\":2}",
      "createdAt": "2026-04-10T12:00:00.000Z",
      "user": { "id": 1, "name": "Alice" },
      "card": { "id": 3, "title": "Fix login redirect" }
    }
  ]
}
```

### Modified Endpoints

- **`PATCH /cards/:id/move`** — now writes an `ActivityEvent` (`card_moved`) atomically with the card move using a Prisma transaction
- **`POST /cards/:id/comments`** — now writes an `ActivityEvent` (`comment_added`) atomically with the comment

## Existing Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/users/register` | — | Register a new user |
| `POST` | `/users/login` | — | Login, returns JWT token |
| `GET` | `/users/:id` | Required | Get user by ID (no password in response) |
| `GET` | `/boards` | Required | List boards for current user |
| `GET` | `/boards/:id` | Required | Board with lists, cards, comments, labels |
| `POST` | `/boards` | Required | Create a board |
| `POST` | `/boards/:id/members` | Required (owner) | Add a member to a board |
| `GET` | `/cards/:id` | Required | Card with comments and labels |
| `POST` | `/cards` | Required | Create a card |
| `PATCH` | `/cards/:id/move` | Required | Move card to different list |
| `POST` | `/cards/:id/comments` | Required | Add a comment |
| `DELETE` | `/cards/:id` | Required | Delete a card |

## Setup

```bash
npm install
cp .env.example .env         # configure JWT_SECRET, DATABASE_URL
npm run db:push               # creates the SQLite database
npm run db:seed               # loads test data
npm run dev                   # starts on http://localhost:3001
npm test                      # run tests
npm run test:coverage         # run with coverage report
```

## Key Improvements

- **Repository pattern** — all 31 direct Prisma calls moved behind repository layer
- **N+1 fixes** — board listing and detail use single Prisma queries with `include`
- **Atomic transactions** — card move + activity logging in a single `$transaction`
- **Centralized auth** — single JWT middleware replaces 3 copy-pasted functions
- **JWT secret from env** — no more hardcoded `'super-secret-key-change-me'`
- **Password exclusion** — register and user endpoints no longer leak password hash
- **Global error handler** — custom error classes with proper HTTP status codes
- **96%+ test coverage** — 35 tests covering all endpoints and architecture constraints