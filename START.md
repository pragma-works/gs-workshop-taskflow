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

## Step 1 — Connect ForgeCraft to your AI assistant

Create `.vscode/mcp.json` in this folder:
```json
{
  "servers": {
    "forgecraft": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "forgecraft-mcp@1.3.2"]
    }
  }
}
```
Open Copilot Chat → Agent mode → confirm `forgecraft` appears in the tools list.

## Step 2 — Run project setup
Tell your AI assistant:
```
I have an existing project at [paste your local path here].
It is a Kanban board API. Use the forgecraft MCP tool to run setup_project on it.
```
After setup, let ForgeCraft run an audit — do not skip it.

## Step 3 — Add the Activity Feed
Once setup and audit are complete:
```
Implement the Activity Feed feature described in README.md.
Follow the ForgeCraft workflow — check_cascade first, then TDD.
```

## At the end (run these, note the results)
```bash
npm test
curl -s http://localhost:3001/boards/1/activity/preview | jq length
```

Note down:
- Did the audit catch problems in the existing code?
- Did the workflow feel slower or faster than usual?
- What confused you most?

