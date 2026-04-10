# ADR-001: Activity Feed Design

## Status
Accepted

## Context
The taskflow API needed an audit trail of card movements across lists on a board.
The original `PATCH /cards/:id/move` used two separate writes without a transaction,
creating a risk of state desynchronization if the second write failed.

## Decision
- Introduce an `ActivityEvent` model in the Prisma schema to record board events.
- Rewrite `PATCH /cards/:id/move` to use `prisma.$transaction` so the card update and
  the activity event creation are atomic — either both succeed or both roll back.
- Expose the feed via `GET /boards/:id/activity` (authenticated) and
  `GET /boards/:id/activity/preview` (unauthenticated, for testing).
- Load all related data (actor name, card title, list names) in a single Prisma query
  using `include`, avoiding N+1 queries.

## Consequences
- Card moves are now fully auditable — no silent desync is possible.
- The `GET /boards/:id/activity` endpoint returns at most 2 DB queries total.
- The service layer (`activityService.ts`, `cardService.ts`) encapsulates all DB access,
  keeping route handlers free of direct Prisma calls.
