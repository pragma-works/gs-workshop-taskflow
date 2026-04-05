# Workshop — Taskflow Group B (ForgeCraft)
**Mode:** ForgeCraft on an existing codebase. Brownfield flow.

## Setup

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-taskflow
cd gs-workshop-taskflow
git checkout condition-b
git checkout -b participant/P007    # replace P007 with your number
cp .env.example .env          # Mac/Linux
copy .env.example .env        # Windows
npm install
npm run db:push               # creates the SQLite database
npm run db:seed               # loads test users and boards
```

> **Before you write any code:** open `INTAKE.md`, fill in your developer profile answers, tick the consent box, and commit it. The scoring pipeline reads it automatically.

Start the server in a dedicated terminal:
```bash
npm run dev                   # starts on http://localhost:3001
```

Verify it works — in a second terminal:
```bash
curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@test.com\",\"password\":\"password123\"}"
```

You should see JSON with a `token` field.

## Your Ticket (PM-5214): Activity Feed

Same task as Group A. Add an **Activity Feed** to the Kanban board.

**New endpoints:**

`GET /boards/:id/activity`
- Returns all activity events for the board, newest first
- Response: `{ events: [{ id, boardId, cardId?, userId, action, meta?, createdAt }] }`
- 401 if unauthenticated · 403 if not a board member · 404 if board not found

`GET /boards/:id/activity/preview` *(no auth required — for smoke testing)*
- Same shape, limited to last 10 events

**Changes to existing endpoints:**

`POST /cards/:id/move` — write an ActivityEvent (`action: "card_moved"`) atomically with the card move

`POST /cards/:id/comments` — write an ActivityEvent (`action: "comment_added"`)

**Known issues in this scaffold** (intentional — scoring rewards fixing them):

| File | Line(s) | Issue |
|------|---------|-------|
| `src/routes/boards.ts` | 23, 41 | Direct `prisma.*` calls — move to repository |
| `src/routes/cards.ts` | 18, 67 | Same |
| `src/routes/users.ts` | 31 | Same |
| `src/middleware/auth.ts` | 12 | Hardcoded JWT secret |
| `src/routes/boards.ts` | 41 | N+1 query |
| `src/routes/cards.ts` | 67 | Missing transaction |

## Scoring (8 pts automated on every push · 6 pts hidden live tests = 14 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `prisma.*` calls in route files — persistence behind a repository layer |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + at least one decision log entry (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |
| **Total** | **14** | |

## Step 1 — Add ForgeCraft to your AI assistant

In VS Code with GitHub Copilot, create `.vscode/mcp.json` in this folder:
```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "forgecraft-mcp@1.4.0"]
    }
  }
}
```

Open Copilot Chat → Agent mode → confirm `forgecraft` appears in tools.

## Fallback — if ForgeCraft isn't loading

If `forgecraft` doesn't appear in your Copilot tools list, use the local fallback — identical behaviour, zero network dependency:

```bash
git clone https://github.com/jghiringhelli/forgecraft-mcp
cd forgecraft-mcp && npm install && npm run build
```

Update `.vscode/mcp.json` to use the local build:

```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/absolute/path/to/forgecraft-mcp/dist/index.js"]
    }
  }
}
```

Then `Ctrl+Shift+P` → *Developer: Reload Window*.

## Step 2 — Run setup on the brownfield project

Tell your AI assistant, replacing the path with wherever you cloned the repo:

```
I have an existing project at [path to your cloned repo].
It is a Kanban board API. Use the forgecraft MCP tool to run setup_project on it.
```

After setup, ForgeCraft will surface the known anti-patterns as violations. Let it.

## Step 3 — Implement the Activity Feed

Once setup and audit are done:

```
Now implement the Activity Feed feature (PM-5214 in START.md).
Follow the ForgeCraft workflow — check_cascade first, then TDD.
Fix the violations the audit flagged as you go.
```

## Observations (write in OBSERVATIONS.md)

**Process:**
- [ ] How many prompts to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Are there direct `prisma.*` calls in your new route files?

**ForgeCraft:**
- [ ] Did ForgeCraft detect this as a brownfield project?
- [ ] Did audit_project surface the N+1, hardcoded JWT, missing error handler?
- [ ] Did the workflow slow down or speed up the feature implementation?
- [ ] What was confusing?

## Before You Finish

```bash
npm test              # all tests should pass
npm run build         # no TypeScript errors
```

Check manually:
- Open your new route file — any `prisma.` calls? (should be 0)
- `git log --oneline -10` — are ≥50% prefixed with `feat:`/`fix:`/`chore:`?
- Does your README describe what you built?

Commit and push:
```bash
git add -A
git commit -m "obs: session notes"
git push origin participant/P007    # replace P007 with your number
```

Let the facilitator know you've pushed — score updates automatically.
