# Workshop — Taskflow Group A (Free Prompting)
**Mode:** Free prompting — you have a PM ticket. Use your AI however you like.

## Setup

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

You should see JSON with a `token` field. Save it for authenticated requests.

## Your Ticket (PM-5214): Activity Feed

Your product manager wrote this:

---

Add an **Activity Feed** to the Kanban board. Users should be able to see what happened on a board.

**New endpoints:**

`GET /boards/:id/activity`
- Returns all activity events for the board, newest first
- Response: `{ events: [{ id, boardId, cardId?, userId, action, meta?, createdAt }] }`
- 401 if unauthenticated · 403 if not a board member · 404 if board not found

`GET /boards/:id/activity/preview` *(no auth required — for smoke testing)*
- Same shape, limited to last 10 events

**Changes to existing endpoints:**

`POST /cards/:id/move` (already exists in `src/routes/cards.ts`)
- Must atomically write an ActivityEvent (`action: "card_moved"`) together with the card status change
- If the event write fails, the card move must roll back
- Auth: 401 · 403 · 404 as above

`POST /cards/:id/comments` (already exists in `src/routes/cards.ts`)
- Must write an ActivityEvent (`action: "comment_added"`)

**Technical debt to address as part of this ticket:**

| File | Line(s) | Issue |
|------|---------|-------|
| `src/routes/boards.ts` | 23, 41 | Direct `prisma.*` calls in route handler — move persistence to a repository |
| `src/routes/cards.ts` | 18, 67 | Same |
| `src/routes/users.ts` | 31 | Same |
| `src/middleware/auth.ts` | 12 | `JWT_SECRET = "hardcoded-secret"` — must read from `process.env.JWT_SECRET` |
| `src/routes/boards.ts` | 41 | N+1 query on board load — replace with a JOIN |
| `src/routes/cards.ts` | 67 | Missing transaction — wrap status change + activity write in `prisma.$transaction` |

**Definition of done:**
- [ ] All new endpoints return correct status codes
- [ ] Activity events written atomically with the operations that trigger them
- [ ] No direct `prisma.*` calls in your new files
- [ ] `JWT_SECRET` read from environment variable
- [ ] Tests cover the new endpoints
- [ ] README updated with an Activity Feed section

---

## Scoring (8 pts automated on every push · 6 pts hidden live tests = 14 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass: correct HTTP status codes, response shapes *(hidden)* |
| **Composable** | 3 | HTTP layer translates only — business logic never leaks into routes *(hidden)* |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `prisma.*` calls in route files — persistence behind a repository layer |
| **Auditable** | 2 | ≥50% conventional commits (1pt) + one decision log entry (1pt) |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |
| **Total** | **14** | |

> **Decision log entry:** any `.md` file where you document a design choice you made and why.

## How to Work

- Use your AI however you want — no rules
- **Commit after each meaningful step.** Aim for at least one commit every 15–20 minutes
- Create `OBSERVATIONS.md` and jot notes as you go

## Observations (write in OBSERVATIONS.md)

**Process:**
- [ ] How many prompts to reach a working endpoint?
- [ ] What fraction of your time was prompting vs manually fixing?
- [ ] Did you need to repeat or rephrase any prompt?

**Quality:**
- [ ] Did the AI introduce anti-patterns you didn't ask for?
- [ ] Are there direct `prisma.*` calls in your new route files?

**Brownfield:**
- [ ] Which anti-patterns did you notice immediately? (N+1, hardcoded JWT, etc.)
- [ ] Did the AI spot and fix the existing debt, or did you have to tell it?
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
git pull --rebase origin participant/P007    # bot may have committed score.json — pull first
git push origin participant/P007    # replace P007 with your number
```

Let the facilitator know you've pushed — score updates automatically.
