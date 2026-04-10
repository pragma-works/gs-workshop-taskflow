# taskflow — Workshop Project

Taskflow is a small Kanban board API built with **Express**, **TypeScript**, **Prisma**, and **SQLite**. It supports users, boards, lists, cards, comments, labels, and now a board-level **activity feed** for card movement events.

## What was built

This workshop pass adds the activity feed feature end to end:

- `ActivityEvent` is now persisted in Prisma with links to the board, actor, card, and source/target lists.
- `PATCH /cards/:id/move` updates the card position and writes the activity event in the **same Prisma transaction**.
- `GET /boards/:id/activity` returns the authenticated board feed.
- `GET /boards/:id/activity/preview` returns the same feed shape without auth for workshop testing.
- Activity responses are enriched with `actorName`, `cardTitle`, `fromListName`, `toListName`, and `timestamp`.

The implementation also tightened a few brownfield issues while adding the feature:

- Prisma access now lives in `src/repositories/taskflowRepository.ts` instead of route files.
- Routes share auth and async error handling helpers.
- The app now returns JSON from the global error handler instead of falling back to raw Express HTML errors.
- User responses no longer expose password hashes.

## Setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

The API starts on `http://localhost:3001`.

To run the test suite:

```bash
npm test
```

## Seed data

The seed creates three users (`alice`, `bob`, `carol`) with password `password123`, one board, three lists, five cards, and sample comments.

## Getting a token

```bash
curl -s -X POST http://localhost:3001/users/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"alice@test.com\",\"password\":\"password123\"}"
```

Use the returned token in authenticated requests:

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3001/boards/1
```

## Activity feed endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/boards/:id/activity` | Returns the board activity feed for authenticated members in reverse chronological order. |
| `GET` | `/boards/:id/activity/preview` | Returns the same feed shape without auth for testing/demo use. |
| `PATCH` | `/cards/:id/move` | Moves a card and writes a `card_moved` activity event atomically. |

Example activity item:

```json
{
  "id": 1,
  "boardId": 1,
  "actorId": 1,
  "actorName": "Alice",
  "eventType": "card_moved",
  "cardId": 3,
  "cardTitle": "Fix login redirect",
  "fromListId": 1,
  "fromListName": "Backlog",
  "toListId": 2,
  "toListName": "In Progress",
  "createdAt": "2026-04-07T10:00:00.000Z",
  "timestamp": "2026-04-07T10:00:00.000Z"
}
```

## Acceptance check

```bash
curl -s -X PATCH http://localhost:3001/cards/1/move ^
  -H "Authorization: Bearer <token>" ^
  -H "Content-Type: application/json" ^
  -d "{\"targetListId\":2,\"position\":0}"

curl -s http://localhost:3001/boards/1/activity/preview
```

The preview feed should return at least one event with populated `actorName` and `cardTitle`.

## Testing approach

The route suite runs against a **named in-memory SQLite database**, so tests exercise the real Express app and Prisma repository code without touching the workshop database file. This keeps the feature verifiable while preserving the seeded local environment for manual testing.
