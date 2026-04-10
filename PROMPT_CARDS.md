# PROMPT CARDS — Group A (taskflow)

Use these five prompts in order. Copy each one into your AI assistant exactly as written.
Before you send each prompt, write down in your log:
- What you expect it to produce
- What you would change about the prompt if you were writing it freehand

After the session: compare what the prompts produced vs. what you expected.
That delta is the data.

---

## Prompt 1 — Read the System

```
Read the entire codebase in the `src/` directory and `prisma/schema.prisma`.
Produce a structural report with the following sections:

1. Data model: list every entity and its key relationships
2. Route inventory: list every implemented endpoint with its HTTP method, path, and one-line description
3. Anti-patterns found: list each one with file, line range, and a one-sentence description of the problem
4. Missing from schema: what the activity feed feature will need that does not yet exist in schema.prisma
5. Missing from routes: note any stubs or TODO comments left for the workshop task

Do not write any code. Analysis only.
```

---

## Prompt 2 — Schema Extension

```
Extend `prisma/schema.prisma` to support the activity feed.

Requirements:
- Add an `ActivityEvent` model with: id, boardId, actorId, eventType (string), cardId (nullable),
  fromListId (nullable), toListId (nullable), createdAt
- Add foreign key relations to Board, User, Card, List
- Do not modify any existing models except to add the back-relations

After editing the schema, output the exact `npx prisma db push` command to apply it.
Do not write any TypeScript yet.
```

---

## Prompt 3 — Atomic Move with Activity Logging

```
Rewrite `PATCH /cards/:id/move` in `src/routes/cards.ts`.

Requirements:
- Accept body: `{ targetListId: number, position: number }`
- Verify the caller is authenticated (use the existing verifyToken function)
- In a single Prisma transaction:
  1. Update the card's listId and position
  2. Create an ActivityEvent with eventType "card_moved", cardId, fromListId, toListId, actorId, boardId
- If the transaction fails, return 500 with `{ error: "Move failed", details: <message> }`
- Return `{ ok: true, event: <the created ActivityEvent> }` on success

Do not modify any other route or file.
```

---

## Prompt 4 — Activity Feed Endpoints

```
Implement the activity feed in `src/routes/activity.ts`.

Endpoints to implement:
1. `GET /boards/:id/activity` — authenticated; returns all ActivityEvents for the board in
   reverse chronological order; each event must include actorName (User.name), cardTitle (Card.title,
   nullable), fromListName (List.name, nullable), toListName (List.name, nullable)
2. `GET /boards/:id/activity/preview` — no auth required; same response shape; for testing

Do NOT query the database in a loop. Use Prisma's `include` to load all related data in
a single query. The entire endpoint must issue at most 2 queries total (one for membership
check if authenticated, one for the events with relations).

Wire the router into `src/index.ts` at path `/boards`.
```

---

## Prompt 5 — Tests

```
Write tests for the activity feed in `src/routes/activity.test.ts`
test framework Vitest
list endpoints to cover

Cover these cases:
1. Unauthenticated request to `GET /boards/:id/activity` returns 401
2. `PATCH /cards/:id/move` creates an ActivityEvent in the same transaction
3. `GET /boards/:id/activity/preview` returns events in reverse chronological order
4. Moving a card to a non-existent list returns 404 (or rolls back cleanly)

Use an in-memory SQLite database for tests — do not call the real DB.
Name each test as a specification: describe what the system does, not what the test does.

adhere to business logic in case of doubt or ask to the user for any concern
```

---

## After all five prompts

Review the final state of the codebase against the original anti-pattern list in `README.md`.

Which ones were fixed as a side effect of implementing the feature?
Which ones survived?
Record both in your log.
