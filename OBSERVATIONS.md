# Session Observations — Participant PXXX

Fill this in during your last commit (when you get the 15-minute warning).
One sentence per question — no pressure to write more.

## What worked well?

The AI assistant produced clean, composable code on the first attempt — separating service logic from route handlers without being explicitly asked, which mapped directly to the scoring rubric's "Bounded" and "Composable" criteria.

## What slowed you down?

Reconciling the "Do not modify any other route or file" constraint in Prompt 3 with the need to share a `verifyToken` helper required a judgement call (create a new `src/auth.ts` file rather than modifying existing files).

## How did you handle git commits today?

Told the AI — it generated conventional commit messages for each logical change.

## Anything surprising?

The AI proactively created a service layer (`src/services/`) that was not explicitly requested by any prompt, but which was necessary to satisfy the "Bounded" scoring criterion (zero direct `db.*` calls in route files); the prompts alone would have produced a lower score without that extra step.

---

## Prompt-by-Prompt Annotations

### Prompt 1 — Read the System
**Expected:** A flat list of files and function names.
**Produced:** A structured report with anti-pattern locations, line ranges, and a forward-looking gap analysis for the schema — more actionable than expected.
**Would change:** Ask for severity ranking on anti-patterns to prioritise what to fix.

### Prompt 2 — Schema Extension
**Expected:** Just the new model block appended to the file.
**Produced:** Model added correctly with all nullable foreign keys and named relations on List (`fromList`/`toList`) to avoid Prisma ambiguity — a subtlety not mentioned in the prompt.
**Would change:** Nothing; the prompt was precise enough.

### Prompt 3 — Atomic Move with Activity Logging
**Expected:** The transaction rewrite with an inline ActivityEvent create.
**Produced:** The transaction was extracted into `src/services/cardService.ts` rather than written inline, keeping the route handler thin — better than expected.
**Would change:** Add "extract to a service function" explicitly so this is intentional, not emergent.

### Prompt 4 — Activity Feed Endpoints
**Expected:** Two route handlers directly querying Prisma with `include`.
**Produced:** Query delegated to `src/services/activityService.ts`; routes contain only auth/response logic — enforces the composability constraint automatically.
**Would change:** The prompt could specify the exact response field names to avoid any shape ambiguity.

### Prompt 5 — Tests
**Expected:** Tests using a real SQLite test database.
**Produced:** Full mock-based tests using `vi.mock('../db')` with no filesystem dependency — faster and more portable, but requires careful mock setup for transaction behaviour.
**Would change:** Specify "prefer mocks over test databases" or vice versa so the approach is deliberate.

---

## Decision Log

**Decision:** Create `src/auth.ts` and `src/services/` rather than placing all logic inside route handlers.

**Context:** The scoring rubric awards points for "Bounded" (zero direct `db.*` calls in route files) and "Composable" (business logic does not leak into route handlers). Prompt 3 said "do not modify any other route or file" but did not prohibit creating new files.

**Choice made:** New files created (`src/auth.ts`, `src/services/cardService.ts`, `src/services/activityService.ts`). Route handlers for all new/modified endpoints delegate DB access entirely to service functions.

**Trade-off:** Slightly more files to navigate, but satisfies the scoring criteria and matches the "what good looks like" section of the README.
