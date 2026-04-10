# taskflow — Workshop Project 2

A Kanban board API. Your team uses it to manage work in columns (Backlog, In Progress, Done),
move cards between them, and discuss work in comments.

---

## Setup (2 minutes)

```bash
cp .env.example .env
npm install
npm run typecheck
npm run db:push
npm run db:seed
npm run dev
```

Server runs on `http://localhost:3001`.

Seed data: **alice**, **bob**, **carol** — all password `password123` — one board, three lists,
five cards, eleven comments across those cards.

### Get a token

```bash
curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"password123"}' | jq .token
```

Export it and use throughout testing:

```bash
export TOKEN="<token from above>"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/boards/1 | jq .
```

Try loading the board and watch your terminal — count the SQL queries.

---

## Your Task: Activity Feed

Implement a chronological activity feed for a board.

### New endpoints to build

| Endpoint | Description |
|---|---|
| `GET /boards/:id/activity` | All activity on the board (auth required) |
| `POST /cards/:id/move` | Move a card — must write an activity event atomically |
| `GET /boards/:id/activity/preview` | No-auth testing endpoint |

### Activity event shape

```json
{
  "id": 1,
  "boardId": 1,
  "actorId": 1,
  "actorName": "Alice",
  "eventType": "card_moved",
  "cardId": 3,
  "cardTitle": "Fix login redirect",
  "fromListName": "Backlog",
  "toListName": "In Progress",
  "timestamp": "2026-04-07T10:00:00.000Z"
}
```

Event types: `card_created`, `card_moved`, `card_commented`.

### Acceptance check

```bash
# move a card
curl -s -X PATCH http://localhost:3001/cards/1/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetListId": 2, "position": 0}'

# preview the feed
curl -s http://localhost:3001/boards/1/activity/preview | jq .

# must return at least one event with actorName and cardTitle
```

---

## Group Instructions

### Group A — Prompt-Only (CLAUDE.md approach)

Use only the five prompt cards in `PROMPT_CARDS.md`, in order.
Copy each prompt into your AI assistant exactly as written.
Log what you changed about each prompt before sending it.

### Group B — Direct Conversation

Work directly with the AI however you normally would.
No constraints on how you prompt — do what feels natural.

---

## Scoring (run at end of session)

```bash
# 1. Tests written
npm test 2>/dev/null | tail -5

# 2. Direct DB calls remaining in routes (lower is better — 0 means clean separation)
grep -rn "prisma\." src/routes/ | wc -l

# 3. Feature works
curl -s http://localhost:3001/boards/1/activity/preview | jq 'length'

# 4. Move atomicity — does a failed comment log desync the card position?
# (manual: kill process mid-move and check DB state)
```

Record in the shared sheet: participant ID, group (A or B), test count, prisma-in-routes count,
feature working (Y/N), and one observation about the process.

---

## Known anti-patterns in this codebase

You will find these as you work. You don't have to fix them all — but the scoring
rewards solutions that eliminate them, and the scoring penalizes solutions that add more.

- The JWT secret is hardcoded in three places
- `PATCH /cards/:id/move` moves the card but does not log activity — two separate operations
  with no transaction, so a crash between them leaves the database inconsistent
- `GET /boards/:id` issues one query per list, one per card, and one per label on each card
- No global error handler — unhandled throws return raw Express 500 HTML
- Passwords returned in user responses

## Environment

Set a strong local JWT secret in `.env` before starting the API.
