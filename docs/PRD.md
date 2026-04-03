# taskflow-B

## Problem

Teams managing work across multiple projects lack a lightweight, self-hosted Kanban
API. Existing tools are either too heavyweight or require expensive SaaS subscriptions.
taskflow-B provides a minimal REST API for boards, lists, cards, and real-time activity
tracking so development teams can integrate Kanban functionality into their own tooling.

## Users

- **Developer / API Consumer** — integrates the API into a front-end or automation
  pipeline; needs predictable REST contracts and JWT authentication.
- **Team Member** — creates and moves cards across lists; expects atomic state changes
  with a full activity trail so nothing is lost if a request fails mid-flight.
- **Board Owner** — manages board membership and reviews the activity feed to audit
  who moved what and when.

## Success Criteria

- All CRUD operations for boards, lists, cards, and comments are covered by the API.
- Card moves are atomic: the card position update and the ActivityEvent write either
  both succeed or both fail (no desync).
- The activity feed returns events in reverse-chronological order with < 100 ms p95
  latency for boards with up to 10 000 events.
- JWT secret is read from environment; no secrets appear in source code.
- Auth middleware is defined once and reused across all protected routes.
- Test coverage ≥ 60 % on new modules.

## Components

- **Users module** — registration, login (bcrypt + JWT), profile retrieval.
- **Boards module** — board CRUD, membership management.
- **Cards module** — card CRUD, move operation (atomic with activity logging).
- **Activity module** — activity feed queries (per-board); ActivityEvent persistence service.
- **Shared middleware** — single `verifyToken` implementation used by all protected routes.
- **Shared config** — environment variable validation; exports typed config constants.

## External Systems

- **SQLite via Prisma ORM** — sole persistence layer (dev.db); swappable to Postgres
  by changing DATABASE_URL without touching application code.
- **jsonwebtoken** — JWT signing and verification; secret supplied via JWT_SECRET env var.
