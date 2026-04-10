# Workshop Log — Group A (taskflow)

**Participant:** Aldo Fermin Marquez
**Group:** A (Prompt-Only / CLAUDE.md approach)
**Date:** 2026-04-10
**AI assistant used:** GitHub Copilot CLI

> **Note on retroactive entries:** Prompts 1–3 were executed before I started
> keeping this log. The "Expected" and "Would change freehand" sections for
> those prompts were written *after* seeing Copilot's output, so they are
> reconstructions, not true pre-registrations. Prompts 4 and 5 onward are
> logged in real time (before sending).

---

## Prompt 1 — Read the System

**Status:** Done (logged retroactively)

### Expected (reconstructed)
A 5-section structural report: (1) data model with entities and relations,
(2) full route inventory with method/path/description, (3) anti-patterns with
file + line ranges, (4) what's missing from the schema for the activity feed,
(5) route stubs/TODOs. No code.

### Would change freehand
_(fill in honestly — e.g. "I'd also ask for a Mermaid diagram of the schema",
or "I'd scope it to just src/routes to save tokens", or "nothing")_

### Actual result
- Produced all 5 sections. Respected "Analysis only" — no code written.
- Found all 5 anti-patterns from the README (hardcoded JWT secret ×3,
  non-atomic move, N+1 in GET /boards/:id, no global error handler,
  passwords in user responses).
- **Extras it found** that weren't in the README list:
  - N+1 for labels inside `GET /cards/:id`
  - `POST /boards/:id/members` missing owner-role check
  - `PATCH /cards/:id/move` missing board-membership check
  - `DELETE /cards/:id` missing ownership check
  - `verifyToken` copy-pasted across three route files
  - Card `position` race condition (set to current row count)
  - No `$disconnect` on Prisma client
- Correctly identified that `src/routes/activity.ts` already exists as a
  stub with TODO comments and is not mounted in `index.ts`.

### Delta vs. expectation
_(fill in — e.g. "more thorough than expected, found several extras beyond
the README list")_

---

## Prompt 2 — Schema Extension

**Status:** Done (logged retroactively)

### Expected (reconstructed)
Copilot edits `prisma/schema.prisma` to add an `ActivityEvent` model with
id, boardId, actorId, eventType, cardId (nullable), fromListId (nullable),
toListId (nullable), createdAt, plus FK relations to Board/User/Card/List
and back-relations on those models. Outputs the `npx prisma db push`
command. No TypeScript.

### Would change freehand
_(fill in — e.g. "I'd add `@@index([boardId, createdAt])` for fast feed
ordering", or "I'd ask for an enum instead of string for eventType", or
"nothing")_

### Actual result
- Added `ActivityEvent` model (lines 96–111) with all required fields and FKs.
- Two relations to `List` named `fromList` and `toList` to disambiguate — a
  Prisma requirement I wouldn't have remembered freehand.
- Back-relations added to User, Board, Card, List without modifying any
  existing fields.
- Output the `npx prisma db push` command at the end. No TypeScript written.
- `npx prisma db push` ran clean: "Your database is now in sync with your
  Prisma schema. Done in 180ms".

### Delta vs. expectation
_(fill in — e.g. "the named relations fromList/toList were a detail I
wouldn't have thought of")_

---

## Prompt 3 — Atomic Move with Activity Logging

**Status:** Done (logged retroactively)

### Expected (reconstructed)
Copilot rewrites `PATCH /cards/:id/move` in `src/routes/cards.ts`.
Auth via existing `verifyToken`. Inside a single `prisma.$transaction`:
update card's listId/position AND create the `ActivityEvent` with
eventType "card_moved". On failure return 500 with `{ error, details }`.
On success return `{ ok: true, event }`. No other files touched.

### Would change freehand
_(fill in — e.g. "I'd add a check that targetListId belongs to the same
board", or "I'd add a board-membership check", or "nothing")_

### Actual result
- Rewrote only `PATCH /cards/:id/move` in `src/routes/cards.ts`, lines 61–109.
  No other files touched.
- Uses `prisma.$transaction([...])` in array form — atomic: both writes
  commit or both roll back.
- Captures `fromListId` **before** the update, using `card.listId` from a
  `findUnique` with `include: { list: true }` — that also gives `boardId`
  in the same query, avoiding a second roundtrip.
- Destructures `[, event]` from the transaction result — index 0 is the
  updated card (unused in response), index 1 is the new ActivityEvent.
- Error handling uses `instanceof Error` guard for safe message extraction.
- The pre-existing anti-patterns (`verifyToken` copy-paste, hardcoded JWT
  secret on line 13, N+1 in GET /cards/:id, no ownership checks) are
  untouched — the prompt told it not to touch anything else, and it obeyed.

### Delta vs. expectation
_(fill in — e.g. "cleaner than I expected, especially using include: { list:
true } to get boardId without a second query")_

---

## Prompt 4 — Activity Feed Endpoints

**Status:** Done

### Prompt sent (verbatim from PROMPT_CARDS.md)
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

### Expected
Copilot fills in the existing stub at `src/routes/activity.ts` with two
endpoints:
- `GET /boards/:id/activity` — calls `verifyToken`, runs a membership check
  (`BoardMember.findUnique` on userId+boardId), then a single
  `activityEvent.findMany` with `include: { actor: true, card: true,
  fromList: true, toList: true }`, ordered by `createdAt desc`. Maps the
  result to flatten `actorName`, `cardTitle`, `fromListName`, `toListName`.
- `GET /boards/:id/activity/preview` — same shape, no auth, no membership
  check (so only 1 query).
- Mounts the router in `src/index.ts` at `/boards`.
- No loops over events to fetch related data — all joins via `include`.

### Would change freehand
Freehand I would probably add two things the prompt card doesn't ask for:
(1) pagination — a `limit`/`cursor` on the feed so it doesn't return every
event ever for a busy board, and (2) an explicit 403 (not just 404) when a
user is authenticated but not a member of the board, so the API
distinguishes "board doesn't exist" from "you can't see it". The "at most
2 queries" constraint is good — I wouldn't change that.


### Actual result
- Created `src/routes/activity.ts` with both endpoints and wired it into
  `src/index.ts` at `/boards` (line 12), after the existing `boardsRouter`
  mount. Express matches `/boards/:id` on `boardsRouter` first and falls
  through to `activityRouter` for `/boards/:id/activity` — no conflict.
- **Query budget respected:**
  - `GET /boards/:id/activity` → exactly 2 queries:
    `boardMember.findUnique` (membership check) + `activityEvent.findMany`
    with `include`.
  - `GET /boards/:id/activity/preview` → exactly 1 query:
    `activityEvent.findMany` with `include`.
- Defined a shared `activityInclude` constant (`actor`, `card`, `fromList`,
  `toList`, each with `select: { name/title: true }`) and reused it in
  both handlers. Used `as const` so TypeScript can derive an
  `EventWithRelations` type for `formatEvents`, avoiding `any`.
- `formatEvents` is a pure `.map()` over the loaded events — no loops
  that hit the DB. Flattens nested Prisma objects into `actorName`,
  `cardTitle`, `fromListName`, `toListName`, using `?? null` for the
  three nullable relations.
- Membership failure returns **403** (not 404) — distinguishes "board
  exists but you can't see it" from "board doesn't exist". This matches
  one of the two items I listed in "Would change freehand".
- `verifyToken` was copy-pasted again into `activity.ts` — the prompt
  didn't forbid it, and the existing codebase pattern uses copy-paste,
  so Copilot followed the local convention. The duplication anti-pattern
  survives.

### Delta vs. expectation
- **Matched expectation:** 2-query / 1-query budget, single `include`,
  no loops, router mounted at `/boards`, flattened response shape.
- **Better than expected:** the `as const` + derived type trick for
  `EventWithRelations` — I would not have written that freehand, I'd
  have typed `any` or let it infer loosely.
- **Better than expected (2):** returned 403 on membership failure
  without being asked — one of the two improvements I wanted freehand.
- **Not addressed (and not required):** pagination — the feed still
  returns every event ever. The prompt card didn't ask for it, and
  Copilot didn't add it.
- **Anti-pattern extended:** `verifyToken` is now copy-pasted in four
  files instead of three. Expected outcome given the prompt scope.

---

## Prompt 5 — Tests

**Status:** Done

### Expected
Copilot creates `src/routes/activity.test.ts`, picks whichever framework
is in `package.json` (likely neither — so it adds Vitest + supertest as
devDependencies and a `test` script). It sets up an in-memory SQLite
database for tests (separate `DATABASE_URL` like `file::memory:?cache=shared`,
runs `prisma db push` against it, seeds minimal fixtures: one board, one
member, two lists, one card). Writes four tests named as specifications
("returns 401 when the caller is unauthenticated", "logs a card_moved
event atomically when a card is moved", "returns events in reverse
chronological order", "rolls back cleanly when the target list does not
exist"). May expose an Express `app` from `src/index.ts` for supertest
to import without listening on a port.

### Would change freehand
Freehand I would probably (1) add a `beforeEach` that truncates the
`ActivityEvent` table so tests don't leak state, (2) use a factory helper
for creating the minimal fixture (board + lists + card) instead of
inline setup in each test, and (3) assert on the response shape fields
(`actorName`, `cardTitle`) explicitly, not just that an event exists.
I would not change the four test cases themselves — they cover the
right behaviors.

### Actual result
- Created `src/routes/activity.test.ts` with 10 passing tests using
  Vitest + supertest. Added the dependencies and a `test` script.
- **Did NOT use in-memory SQLite** as the prompt required. Instead,
  Copilot used `vi.mock('../db', ...)` to replace the Prisma singleton
  with plain `vi.fn()` stubs for each method the routes call
  (`boardMember.findUnique`, `card.findUnique`, `card.update`,
  `activityEvent.create`, `activityEvent.findMany`, `$transaction`).
- Built a minimal Express `app` inline in the test file mounting only
  `activityRouter` and `cardsRouter` — deliberately avoids importing
  `src/index.ts` to prevent the `app.listen()` side-effect.
- Uses a **real JWT** signed with the hardcoded secret
  `super-secret-key-change-me`, so `verifyToken` actually runs a real
  `jwt.verify` call. Authentication logic is under real test; only the
  database layer is mocked.
- Test structure:
  1. `GET /boards/:id/activity` — 401 without header, 403 when not a
     member, 200 with events when member.
  2. `PATCH /cards/:id/move` — verifies `$transaction` is called exactly
     once, with both `card.update` and `activityEvent.create` inside it;
     asserts the derived `boardId` comes from `card.list.boardId`.
  3. `GET /boards/:id/activity/preview` — no-auth, ordering
     (newest first), correct `orderBy` args, and flattened response
     shape (no nested `actor`/`fromList` bleed-through).
  4. Split into two specs: "404 when card not found" (before
     transaction) and "500 Move failed when FK fails inside transaction"
     — they exercise different code paths.
- `beforeEach(() => vi.clearAllMocks())` resets call records between tests.
- All 10 tests pass.

### Delta vs. expectation
- **Major deviation from the prompt:** the prompt explicitly said
  *"Use an in-memory SQLite database for tests — do not call the real DB"*.
  Copilot interpreted "do not call the real DB" as permission to mock
  Prisma entirely and ignored "use in-memory SQLite". This is a
  meaningful difference:
  - **Mocks** verify the route calls the right Prisma methods with the
    right arguments, but cannot catch schema drift, wrong `include`
    shapes, or real constraint violations.
  - **In-memory SQLite** would have exercised the actual Prisma client
    against a real (throwaway) database, catching things like
    "does the `include` actually return the nested shape I expect?"
    and "does a real FK violation produce the error I'm asserting on?".
  - Test 4 (FK failure rollback) is the clearest loss: with mocks, the
    test just asserts `$transaction` was called and returns the error
    I handed it — it does not verify that Prisma actually rolls back.
- **Matched expectation:** Vitest + supertest added, minimal app
  avoiding `index.ts`, specification-style test names, four behaviors
  covered (plus six extras).
- **Better than expected:** real JWT verification instead of mocking
  `jsonwebtoken`; splitting test 4 into two specs for the two distinct
  code paths; asserting on the flattened response shape explicitly.
- **My freehand items revisited:**
  - `beforeEach` for state reset: present (as `vi.clearAllMocks()`).
  - Factory helper for fixtures: present (`makeEvent`, `MOCK_CARD`).
  - Assertions on `actorName` / `cardTitle`: present (in the
    "flattens relation names" spec).
  So freehand I would have landed in roughly the same place on
  structure — but I would not have mocked Prisma; I would have used
  the in-memory SQLite the prompt asked for.
- **Takeaway for Group A:** this is the prompt-only process's most
  interesting failure mode so far. The prompt was specific about the
  infrastructure choice, and Copilot overrode it silently and
  delivered passing tests. Because the rules say "paste the prompt
  exactly", I can't follow up with "no, use a real in-memory DB" —
  I have to accept the deviation as data.

---

## Final anti-pattern review

From the README's "Known anti-patterns" list:

| Anti-pattern | Status | Notes |
|---|---|---|
| JWT secret hardcoded in 3 places | **Made worse** | Prompt 4 added a 4th copy in `src/routes/activity.ts:12`. None of the prompt cards told Copilot to centralize it, so it followed the local copy-paste convention. |
| `PATCH /cards/:id/move` non-atomic | **Fixed** (Prompt 3) | Rewritten to use `prisma.$transaction([...])`; the card update and the `ActivityEvent` insert now commit or roll back together. Verified end-to-end: a successful move produces one event; the test for FK failure returns 500 with `Move failed`. |
| N+1 in `GET /boards/:id` | **Survived** | None of the five prompt cards touched `src/routes/boards.ts`. The cascading per-list / per-card / per-label queries are still there. |
| No global error handler | **Survived** | `src/index.ts` still has no `app.use((err, req, res, next) => ...)`; unhandled throws return HTML 500s. Prompt 4 did add the activity router but didn't install an error handler. |
| Passwords returned in user responses | **Survived** | `src/routes/users.ts` untouched by Group A. `POST /register` and `GET /users/:id` still return the hashed password field. |

**Net score: 1 fixed, 3 survived, 1 made worse.** This is the structural
cost of the prompt-only approach: the five prompt cards were scoped
tightly to the activity feature, so anti-patterns outside that scope
were never surfaced to the AI.

## Scoring results (run at the end)

```
npm test 2>/dev/null | tail -5                   → 10 tests passed (1 test file)
grep -rn "prisma\." src/routes/ | wc -l          → 53
curl .../activity/preview  (parsed length)       → 1 event (after one move)
```

**Feature working:** Yes. End-to-end verification:
- `PATCH /cards/1/move` with `{targetListId: 2, position: 0}` returned
  `{"ok":true,"event":{...,"eventType":"card_moved","fromListId":1,"toListId":2,...}}`
- `GET /boards/1/activity/preview` returned an array with one event
  carrying the full flattened shape:
  `actorName: "Alice"`, `cardTitle: "User auth flow"`,
  `fromListName: "Backlog"`, `toListName: "In Progress"`.

**On the prisma-in-routes count (53):** this number is high because the
prompt cards never asked Copilot to introduce a service layer. Every
`prisma.*` call from the original codebase is still in `src/routes/*`,
plus the new ones added by Prompts 3 and 4. A freehand approach would
probably have extracted a `services/activityService.ts` to drive this
number down; the prompt-only approach scores poorly on it by design.

## Summary row for the shared sheet

| Field | Value |
|---|---|
| Participant ID | Aldo Fermin Marquez |
| Group | A (Prompt-Only) |
| Test count | 10 passing |
| `prisma.*` in routes | 53 |
| Feature working | Yes |

---

## Post-submission: Recovery prompt (outside Group A rules)

After the first push, the scoring bot returned 3/8 on automated checks:
- Self-describing 0/1 — README not modified from template
- Bounded 0/2 — 35 direct prisma calls in routes
- Verifiable 1/2 — 10 tests pass but coverage only 19% (need ≥ 60%)
- Defended 1/1 ✓
- Auditable 1/2 — conventional commits OK, decision log missing

This recovery phase is **outside the Group A prompt-only constraint**
— the five PROMPT_CARDS.md prompts were already exhausted. To reach 8/8
automated, one consolidated freehand prompt was sent covering all four
gaps in one pass.

### Prompt sent
_(see below — single recovery prompt targeting all four scoring gaps)_

### Actual result
_(fill in after Copilot responds)_

### Delta vs. expectation
_(fill in after)_

---

## One observation about the process
The most interesting moment of the session was Prompt 5: the prompt
explicitly said "use an in-memory SQLite database — do not call the
real DB", and Copilot silently replaced that with `vi.mock('../db')`
and delivered 10 passing tests anyway. Under Group A rules I can't
follow up to correct it, which made it obvious how much the
prompt-only process trades safety for reproducibility: you get an
audit trail of exactly what you asked for, but you lose the ability
to recover when the model interprets an instruction loosely.
