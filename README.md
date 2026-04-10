# taskflow — Workshop Project

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## Activity Feed (PM-5214)

This ticket adds an **Activity Feed** so users can see what happened on a board.

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/boards/:id/activity` | Yes | All activity events for the board, newest first. 401/403/404. |
| `GET` | `/boards/:id/activity/preview` | No | Last 10 events (for smoke testing). |

### Modified endpoints

| Method | Path | Change |
|--------|------|--------|
| `PATCH` | `/cards/:id/move` | Now atomically writes an `ActivityEvent` (`card_moved`) in the same Prisma transaction as the card move. Rolls back on failure. |
| `POST` | `/cards/:id/comments` | Now atomically writes an `ActivityEvent` (`comment_added`) alongside the comment. |

### Architecture changes

- **Repository layer** (`src/repositories/`) — all `prisma.*` calls moved out of route handlers into dedicated repository modules (`boardRepository`, `cardRepository`, `userRepository`, `activityRepository`).
- **Shared auth middleware** (`src/middleware/auth.ts`) — deduplicated `verifyToken` from 3 files into one. `JWT_SECRET` read from `process.env.JWT_SECRET`.
- **N+1 queries fixed** — board detail and card detail now use Prisma `include` for single-query loads.
- **Password no longer leaked** in register and get-user responses.

### Schema addition

```prisma
model ActivityEvent {
  id        Int      @id @default(autoincrement())
  boardId   Int
  userId    Int
  action    String
  cardId    Int?
  meta      String?
  createdAt DateTime @default(now())
  board     Board    @relation(fields: [boardId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  card      Card?    @relation(fields: [cardId], references: [id])
}
```

---

## Setup

```bash
npm install
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm run db:push               # creates the SQLite database
npm run db:seed               # loads test data
npm run dev                   # starts on http://localhost:3001
npm test                      # run tests
```

---

## What good looks like

- Cards belong to columns; columns belong to boards — correct ownership enforced
- Moving a card to Done does not delete it
- Comments are attached to cards, not boards
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test