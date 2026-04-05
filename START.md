# Workshop — Taskflow Group B (ForgeCraft GS)
**Mode:** ForgeCraft on an existing codebase. Brownfield flow.

## Setup (do this first)

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

Start the server in a dedicated terminal:
```bash
npm run dev                   # starts on http://localhost:3001
```

Verify it works — open a second terminal and get a token:
```bash
curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@test.com\",\"password\":\"password123\"}" | jq .token
```

## Known Issues in This Scaffold
These are intentional. You don't have to fix all of them — but the scoring rewards fixing them.

- Direct Prisma calls in route files (6 instances)
- Missing error middleware
- No request validation on inputs
- Hardcoded JWT secret (check src/middleware/auth.ts)
- Missing atomic transaction on task status change + activity log
- N+1 query pattern on board load
- No ownership check before comment operations

## Your Goal
Add an **Activity Feed** to this existing (deliberately flawed) codebase, using the ForgeCraft workflow.
Full details in `README.md` → "Your Task: Activity Feed".

## Success Criteria (8 pts automated + 6 pts hidden live tests = 14 pts total)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden live test)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden live test)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `prisma\.\*` calls in route files — persistence behind a repository layer |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + at least one ADR or decision doc (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors — type contracts intact |
| **Total** | **14** | 8 pts automated on push · 6 pts revealed after submission |

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

## Step 2 — Run setup on the brownfield project
Tell your AI assistant, replacing the path with wherever you cloned the repo:

```
I have an existing project at [path to your cloned repo].
It is a Kanban board API. Use the forgecraft MCP tool to run setup_project on it.
```
After setup, ForgeCraft should instruct the AI to run `audit_project` — let it.
The audit will surface the known anti-patterns as violations.

## Step 3 — Add the Activity Feed
Once setup and audit are done:
```
Now implement the Activity Feed feature as described in README.md.
Follow the ForgeCraft workflow — check_cascade first, then TDD.
Fix the violations the audit flagged as you go.
```

## What to Observe (write notes in OBSERVATIONS.md as you go)

**Process:**
- [ ] How many prompts did it take to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt more than once?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Did the AI fix problems you didn't mention?
- [ ] Are there direct prisma.* calls in your new route files?
- [ ] Does the response include any fields that shouldn't be exposed?

**ForgeCraft:**
- [ ] Did ForgeCraft detect this as a brownfield project and run audit automatically?
- [ ] Did audit_project surface the N+1, hardcoded JWT, missing error handler?
- [ ] Did the workflow slow down or speed up the feature implementation?
- [ ] How did the AI handle the missing spec — did it try to reverse-engineer one?
- [ ] What was confusing about the tools or workflow?

## Before You Finish

Run these checks:
```bash
npm test              # All tests should pass
npm run build         # Should compile clean (no TypeScript errors)
```

Check manually:
- Open your new route file. Is there any `prisma.` in it? (Should be 0)
- Run `git log --oneline -10`. Are ≥50% of your commits prefixed with feat:/fix:/chore:?
- Does your README describe the feature you built?

Commit your OBSERVATIONS.md:
```bash
git add -A
git commit -m "obs: session observations and notes"
git push origin participant/P007    # replace P007 with your number
```

Then let the facilitator know you've pushed — the score will update automatically.
