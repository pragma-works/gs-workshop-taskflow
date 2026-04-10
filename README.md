# taskflow — Workshop Project

A Kanban board API with activity tracking. Teams use it to manage work in columns (Backlog, In Progress, Done), move cards between lists, discuss work in comments, and track all activity through an audit log.

## Features Implemented

### Core Kanban Functionality
- **Boards & Lists**: Organize work into boards with customizable lists
- **Cards**: Create, move, and manage tasks with descriptions, due dates, and assignments
- **Comments**: Discuss work directly on cards
- **Labels**: Tag cards for better organization
- **Board Membership**: Control access with owner/member roles

### Activity Feed (PM-5214) ✅
- **Activity Tracking**: Every card move is logged with actor, timestamp, and list transition
- **Board Activity Feed**: Authenticated endpoint returns chronological activity for board members
- **Activity Preview**: Public endpoint for testing (no auth required)
- **Atomic Operations**: Card moves and activity logging happen in a single transaction

### Architecture
- **Layered Design**: Routes → Services → Repositories → Database
- **No Direct DB Access in Routes**: All data access through repository layer
- **Centralized Auth**: JWT middleware with environment-configurable secret
- **Authorization**: Board membership checked before sensitive operations
- **Error Handling**: Global error handler returns JSON responses

---

## Your instructions are in START.md

Open `START.md` — it has your task brief (PM-5214), scoring rubric, and step-by-step instructions for your group.

---

## Setup

```bash
npm install
npm run db:push   # creates the SQLite database
npm run dev       # starts on http://localhost:3000
npm test          # run tests
```

---

## How scoring works

Every time you push to your `participant/PXXX` branch, a GitHub Actions workflow runs automatically:

1. Checks out your code
2. Runs `npm run score` — a scoring script that analyses your repo against 7 code quality properties
3. Writes the result to `score.json` on your branch (committed by the bot)
4. Uploads it as a workflow artifact

**You never need to run scoring manually.** Push your code → wait ~60s → check the Actions tab.

The score is re-computed on every push, so the latest push always reflects your current state.

---

## What gets scored (automated, 8 pts)

| Property | Pts | What earns it |
|----------|-----|---------------|
| **Executable** | 3 | API contracts pass hidden live tests (HTTP status codes, response shapes) |
| **Composable** | 3 | Business logic does not leak into route handlers (hidden live test) |
| **Verifiable** | 2 | All tests pass + ≥60% line coverage on new files |
| **Bounded** | 2 | Zero direct `db.*` calls in route files |
| **Auditable** | 2 | ≥50% conventional commits + one decision log entry |
| **Self-describing** | 1 | README describes what you built |
| **Defended** | 1 | Zero TypeScript errors |

Executable and Composable are scored via hidden live tests after the session. The other 8 points are computed automatically on every push and visible in your `score.json`.

---

## Scoring is blind

`score.ts` receives no information about which experimental condition you are in — it analyses whatever code is on your branch. This makes the experiment inherently double-blind by design.

---

## What good looks like

- Cards belong to columns; columns belong to boards — correct ownership enforced
- Moving a card to Done does not delete it
- Comments are attached to cards, not boards
- JWT secret comes from an env var, never hardcoded
- Every endpoint has at least one test