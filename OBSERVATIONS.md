# Session Observations — Participant PXXX

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## Prompt Log

### Prompt 1 — Read the System

- Expected output: a structural report covering the current data model, every implemented route, the main anti-patterns already present in `src/`, and the schema and route gaps needed for the activity feed.
- Freehand prompt change: explicitly ask for existing activity-related stubs in `src/routes/activity.ts` and for a distinction between workshop anti-patterns and broader code smells already in the repo.

#### Structural Report

1. **Data model**
   - `User`: has many `BoardMember` memberships, assigned `Card`s, and authored `Comment`s.
   - `Board`: has many `BoardMember`s and `List`s.
   - `BoardMember`: join table between `User` and `Board`, keyed by `(userId, boardId)`, with a `role`.
   - `List`: belongs to a `Board` and has many `Card`s.
   - `Card`: belongs to a `List`, optionally belongs to an assignee `User`, and has many `Comment`s and `CardLabel`s.
   - `Label`: has many `CardLabel`s.
   - `CardLabel`: join table between `Card` and `Label`, keyed by `(cardId, labelId)`.
   - `Comment`: belongs to a `Card` and a `User`.
2. **Route inventory**
   - `POST /users/register`: creates a user and returns the created record.
   - `POST /users/login`: authenticates a user and returns a JWT.
   - `GET /users/:id`: returns a user by id.
   - `GET /boards`: lists boards for the authenticated user.
   - `GET /boards/:id`: returns one board with nested lists, cards, comments, and labels.
   - `POST /boards`: creates a board and the caller's owner membership.
   - `POST /boards/:id/members`: adds a member to a board.
   - `GET /cards/:id`: returns one card with comments and labels.
   - `POST /cards`: creates a card in a list.
   - `PATCH /cards/:id/move`: moves a card to another list.
   - `POST /cards/:id/comments`: creates a comment on a card.
   - `DELETE /cards/:id`: deletes a card.
3. **Anti-patterns found**
   - `src/db.ts:3-4`: a process-wide Prisma singleton is created with no connection lifecycle handling.
   - `src/index.ts:13-15`: the server has no global error handler, so uncaught failures fall back to Express defaults.
   - `src/routes/boards.ts:7-23`: auth parsing and membership logic are implemented inline instead of behind shared helpers or middleware.
   - `src/routes/boards.ts:35-41`: board listing uses an N+1 loop that loads each board separately after fetching memberships.
   - `src/routes/boards.ts:71-89`: nested loops trigger repeated per-list, per-card, and per-label queries for board details.
   - `src/routes/boards.ts:125-126`: member creation skips any owner or role check on the acting user.
   - `src/routes/cards.ts:7-15`: token verification is duplicated again, including the hardcoded JWT secret.
   - `src/routes/cards.ts:31-38`: label loading uses a card-label loop plus per-label lookups.
   - `src/routes/cards.ts:83-90`: the move flow splits state changes across non-transactional steps and only logs to stdout.
   - `src/routes/cards.ts:120-121`: card deletion does not verify board membership or ownership.
   - `src/routes/users.ts:8-17`: token verification is duplicated again with the same hardcoded secret.
   - `src/routes/users.ts:23-25`: register returns the stored password hash.
   - `src/routes/users.ts:47-53`: user lookup also returns the stored password hash.
   - `src/routes/activity.ts:5-8`: the activity feed route file is only a stub with workshop TODO notes.
4. **Missing from schema**
   - No `ActivityEvent` model exists.
   - `Board`, `User`, `Card`, and `List` do not yet expose back-relations for activity events.
5. **Missing from routes**
   - `src/routes/activity.ts` is still a stub for both board activity endpoints.
   - `src/index.ts` does not wire the activity router.
   - `PATCH /cards/:id/move` does not persist activity events.
   - `POST /cards/:id/comments` does not persist activity events.

#### Prompt 1 delta

- Actual vs expected: the report matched the expected structure and also exposed that `src/routes/activity.ts` already exists as a stub instead of being fully absent.
- Extra note: the workshop anti-pattern list referenced in the cards lines up with `START.md`; `README.md` does not carry that detailed list.

### Prompt 2 — Schema Extension

- Expected output: a minimal Prisma schema diff that adds `ActivityEvent`, wires the required relations to `Board`, `User`, `Card`, and `List`, and leaves TypeScript untouched.
- Freehand prompt change: explicitly name the relation aliases needed for the two nullable `List` references so the Prisma schema stays unambiguous on the first pass.
- Exact apply command: `npx prisma db push`

#### Prompt 2 delta

- Actual vs expected: the schema change stayed minimal and only added `ActivityEvent` plus the required back-relations.
- Extra note: Prisma needed `DATABASE_URL` in the shell before `db push` would run, even though the command itself remained `npx prisma db push`.

### Prompt 3 — Atomic Move with Activity Logging

- Expected output: a route-only rewrite of `PATCH /cards/:id/move` that still uses the existing auth helper, creates the move event in the same Prisma transaction, and returns either the created event or a structured failure payload.
- Freehand prompt change: explicitly mention how missing cards and missing target lists should be surfaced so the transaction-focused requirement does not blur the 404 behavior.

#### Prompt 3 delta

- Actual vs expected: the move route stayed in `src/routes/cards.ts`, kept the existing auth helper pattern, and now returns the created `ActivityEvent`.
- Extra note: handling missing cards and missing target lists explicitly made the rollback behavior measurable for the later tests.

### Prompt 4 — Activity Feed Endpoints

- Expected output: a new `src/routes/activity.ts` implementation with one authenticated board feed endpoint, one preview endpoint, relation-loaded event hydration in a single query, and a router mount in `src/index.ts`.
- Freehand prompt change: explicitly call out the response envelope so the implementation does not have to infer whether the endpoint should return `{ events }` or a bare array.

#### Prompt 4 delta

- Actual vs expected: the new route file now serves both activity endpoints and hydrates actor, card, and list names with a single relation-loaded event query.
- Extra note: `src/index.ts` also needed a `require.main === module` guard so the server could be imported safely in the route tests.

### Prompt 5 — Tests

- Expected output: a Vitest file at `src/routes/activity.test.ts` that drives the real Express app against an isolated SQLite-backed Prisma client and covers auth failure, move logging, preview ordering, and rollback-or-404 behavior.
- Freehand prompt change: replace the vague database instruction with an explicit shared in-memory SQLite URI plus setup steps, because Prisma needs the schema to exist before the tests can query it.

#### Prompt 5 delta

- Actual vs expected: the test file landed in `src/routes/activity.test.ts`, used Vitest, exercised the real Express routes, and covered all four requested behaviors.
- Extra note: the in-memory SQLite setup needed manual schema bootstrap through Prisma raw SQL because the Prisma CLI cannot persist a separate process-level in-memory database for the test run.

## After All Five Prompts

- Reference note: the detailed anti-pattern list lives in `START.md`, not `README.md`, so that workshop brief was the effective source for the comparison.
- Fixed as a side effect:
  - `src/routes/cards.ts` missing transaction on the move route: fixed by wrapping the card update and `ActivityEvent` creation in one Prisma transaction.
- Survived:
  - `src/routes/boards.ts` direct `prisma.*` calls: still present.
  - `src/routes/cards.ts` direct `prisma.*` calls: still present.
  - `src/routes/users.ts` direct `prisma.*` calls: still present.
  - Hardcoded JWT secret: still present in route-local auth helpers.
  - `src/routes/boards.ts` N+1 query behavior: still present.

## What worked well?

Following the prompt order produced a working activity-feed implementation with matching schema, routes, and tests without needing to restart the task from scratch.

## What slowed you down?

The main time sink was compensating for prompt ambiguity and environment details, especially the missing `DATABASE_URL` in the shell and the extra setup required for Prisma-backed in-memory tests.

## How did you handle git commits today?

mixed

## Anything surprising?

The prompts were specific enough to move the feature forward, but they did not fully account for repo-specific details like the existing activity stub, the README/START mismatch, and Prisma test setup constraints.
