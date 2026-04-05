# Workshop — Taskflow Group A (Prompt Cards)
**Mode:** Use the provided prompt cards in order. Log what you changed.

## Setup (do this first)

The facilitator will give you your participant number (e.g. **P007**).

```bash
git clone https://github.com/pragma-works/gs-workshop-taskflow
cd gs-workshop-taskflow
git checkout condition-a
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

You should receive a JSON response with a `token` field. Save it for authenticated requests.

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
Add an **Activity Feed** to this existing (deliberately flawed) codebase.
Full details in `README.md` → "Your Task: Activity Feed".

## Success Criteria (8 pts automated + 6 pts hidden live tests = 14 pts total)
- **Verifiable** (2 pts): All tests pass + ≥60% coverage on your new feature files
- **Bounded** (2 pts): Zero direct `prisma.*` calls in new route files
- **Self-describing** (1 pt): README describes what you built
- **Auditable** (1 pt): At least one ADR or decision doc for a meaningful architectural choice
- **Auditable** (1 pt): ≥50% of your commits follow conventional format (feat:, fix:, chore:, etc.)
- **Composable** (3 pts): Clean architecture — no leaking concerns, proper layering *(hidden live test, revealed after submission)*
- **Executable** (3 pts): API behavioral contracts pass — correct status codes, response shapes *(hidden live test, revealed after submission)*

## How to Work
- Use the prompt cards in `PROMPT_CARDS.md`, in order
- Before each prompt: write what you plan to change in `PROMPT_LOG.md`
- **Commit after each prompt card** — use `git commit -m "prompt-N: description"`. Aim for at least one commit every 15–20 minutes.
- Create `OBSERVATIONS.md` and jot notes as you go

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

**Automation:**
- [ ] Which anti-patterns did you notice immediately? (N+1, hardcoded JWT, etc.)
- [ ] How many prompt cards felt wrong or needed major edits?
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
