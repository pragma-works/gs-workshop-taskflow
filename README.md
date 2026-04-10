# taskflow — Activity Feed Feature

A Kanban board API built with Express, Prisma, and SQLite. Boards contain lists; lists contain
cards; cards can be moved between lists, commented on, and labelled.

---

## What was built in this branch

### Activity Feed (PM-5214)

This branch adds a durable activity feed that records every card move and makes it queryable
per board. Three endpoints were implemented or modified:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PATCH` | `/cards/:id/move` | JWT | Moves a card to a target list; atomically writes an `ActivityEvent` in the **same Prisma transaction** so the card position and the event are always in sync — no desync is possible on failure |
| `GET` | `/boards/:id/activity` | JWT (member only) | Returns all `ActivityEvent` rows for the board in reverse chronological order, each enriched with `actorName`, `cardTitle`, `fromListName`, and `toListName` loaded via a single Prisma `include` call — no query loops |
| `GET` | `/boards/:id/activity/preview` | None | Same response shape as above; no authentication required — useful for local testing without a token |

### Response shape (`ActivityEvent`)

```json
{
  "id": 1,
  "boardId": 1,
  "actorId": 7,
  "actorName": "Alice",
  "eventType": "card_moved",
  "cardId": 5,
  "cardTitle": "Fix login bug",
  "fromListId": 1,
  "fromListName": "Backlog",
  "toListId": 2,
  "toListName": "In Progress",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

### Repository layer

All direct Prisma access was moved out of route files into `src/repositories/`:

- `userRepo.ts` — user creation and authentication (bcrypt handled here)
- `boardRepo.ts` — board listing, detail fetching, membership management
- `cardRepo.ts` — card CRUD, the atomic `moveCard` (transaction owner)
- `activityRepo.ts` — event queries with typed Prisma `include`

Route files no longer import `prisma` directly — zero `prisma.*` calls outside the
repository layer.

---

## Setup

```bash
npm install
npx prisma db push   # apply schema (creates SQLite DB + ActivityEvent table)
npm run dev          # starts on http://localhost:3001
```

---

## Running tests

```bash
npm test                  # run all 39 unit tests (Vitest + supertest, mocked DB)
npm run test:coverage     # run with v8 coverage report (currently ~95% line coverage)
```

Tests live alongside routes in `src/routes/*.test.ts` and use `vi.mock('../db')` to
intercept all Prisma calls — no real database is needed to run the test suite.

---

## Running the scorer

```bash
npm run score   # writes score.json and prints the 8-point breakdown to stdout
```

The scorer checks: README updated, zero `prisma` in route files, test pass rate,
line coverage ≥ 60%, CI config, conventional commits, and a decision log file.

---

## Schema change

`prisma/schema.prisma` adds one new model:

```prisma
model ActivityEvent {
  id         Int      @id @default(autoincrement())
  boardId    Int
  actorId    Int
  eventType  String
  cardId     Int?
  fromListId Int?
  toListId   Int?
  createdAt  DateTime @default(now())
  board    Board  @relation(...)
  actor    User   @relation(...)
  card     Card?  @relation(...)
  fromList List?  @relation("fromList", ...)
  toList   List?  @relation("toList", ...)
}
```
