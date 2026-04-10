# Design Decisions

## Atomic card move with activity logging

**Decision:** Use `prisma.$transaction([card.update, activityEvent.create])` instead of two sequential awaits.

**Why:** The original implementation wrote the card move and the activity log as two separate DB writes with no transaction. If the second write failed, the card would be in its new position but no activity event would exist — a silent state desync that is invisible to the API consumer and nearly impossible to detect after the fact.

Wrapping both operations in a single transaction guarantees that either both succeed or both roll back. The caller always sees a consistent state: if the move is visible in `GET /boards/:id`, its event is visible in `GET /boards/:id/activity`.

**Trade-off considered:** An interactive transaction (`prisma.$transaction(async (tx) => { ... })`) would allow reading `fromListId` inside the transaction boundary, but the sequential array form is sufficient here because `fromListId` is read before the transaction starts and the list is not mutated concurrently in this workload.

---

## Single-query activity feed with `include`

**Decision:** Load all `ActivityEvent` relations (`actor`, `card`, `fromList`, `toList`) in a single `findMany` with `include` rather than fetching related records in a loop.

**Why:** A loop-based approach (fetch events, then for each event fetch user/card/list) produces N+1 queries — one extra round-trip per event. For a board with 100 events that is 401 queries vs 1. The `include` approach lets Prisma emit a small number of JOINs regardless of result size, keeping latency flat as the feed grows.
