# taskflow — Activity Feed workshop solution

Taskflow is a Kanban board API built with **TypeScript**, **Express**, **Prisma**, **SQLite**, and **JWT**. Boards own lists, lists own cards, cards can be moved between columns, and users can discuss work through card comments. This branch completes the workshop ticket by adding a board **Activity Feed** and refactoring the original starter code so the API logic is no longer embedded directly in route handlers.

## What was built

The API now records board activity for the two actions requested by the exercise:

- moving a card writes an `ActivityEvent` with action `card_moved`
- adding a comment writes an `ActivityEvent` with action `comment_added`
- `GET /boards/:id/activity` returns the full feed for authenticated board members
- `GET /boards/:id/activity/preview` returns the latest 10 events without auth for smoke testing

Events are returned newest first in the shape required by the ticket:

```json
{
  "events": [
    {
      "id": 1,
      "boardId": 2,
      "cardId": 8,
      "userId": 3,
      "action": "card_moved",
      "meta": {
        "fromListId": 4,
        "toListId": 5,
        "actorName": "Alice",
        "cardTitle": "Ship activity feed",
        "fromListName": "Backlog",
        "toListName": "Done"
      },
      "createdAt": "2026-04-10T20:00:00.000Z"
    }
  ]
}
```

## Key fixes from the starter repo

The original repository intentionally contained several anti-patterns for the workshop. Those were addressed as part of the implementation:

- JWT signing and verification now use `JWT_SECRET` from the environment instead of a hardcoded secret
- route handlers are thin and delegate to **services** and **repositories**
- direct Prisma access was removed from route files
- board and card reads avoid the original N+1 query patterns by loading related records through Prisma includes
- card moves and comment creation write activity inside database transactions
- user responses no longer expose password hashes
- tests run against isolated SQLite databases so API behavior is exercised without mutating the development database

## Architecture

The app is now composed as:

```text
Express routes -> services -> repositories -> Prisma
```

This keeps HTTP concerns in the route layer, business rules in services, and persistence in repositories. The composition root lives in `src/app.ts`, while `src/index.ts` only starts the server.

## Local setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

The server starts on `http://localhost:3001`.

Required environment variables:

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me"
PORT=3001
```

## Validation commands

```bash
npm test
npm run test:coverage
npm run build
```

## Workshop notes

The project still follows the workshop flow described in `START.md`, but this branch now reflects the requested feature and the architecture cleanup needed for the scoring rules: bounded routes, executable contracts, and verifiable behavior through tests.
