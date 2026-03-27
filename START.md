# Session Instructions

## Setup
```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev     # starts on http://localhost:3001
```

Verify it works:
```bash
curl -s -X POST http://localhost:3001/users/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alice@test.com\",\"password\":\"password123\"}" | jq .token
```

## Your task
Add an **Activity Feed** to this existing codebase.

→ Read `README.md` → "Your Task: Activity Feed" for the full spec.

## How to work
- Use the prompt cards in `PROMPT_CARDS.md`, in order
- Before each prompt: write what you plan to change in `PROMPT_LOG.md`
- Commit after each prompt: `git commit -m "prompt-N: description"`

## At the end (run these, note the results)
```bash
npm test
curl -s http://localhost:3001/boards/1/activity/preview | jq length
```

Note down:
- Which anti-patterns did you spot in the codebase?
- Did the AI introduce any new ones?
- How many prompt cards needed major edits?
