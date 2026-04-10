# Decision Log — Activity Feed Design

## Decision: Use Prisma $transaction for atomic card moves

**Date:** 2026-04-10  
**Context:** The original card move endpoint used two separate writes — one to update the card and one to log the activity. If the second write failed, the card would be moved but no activity would be recorded, causing state desynchronization.

**Decision:** Wrap both the card update and ActivityEvent creation inside a single Prisma `$transaction`. Validate the target list exists before entering the transaction to provide a clean 404 response.

**Rationale:**
- Prevents orphaned state (card moved without activity log)
- Prevents phantom events (activity logged but card not moved)
- Prisma interactive transactions are the idiomatic approach for multi-write atomicity in Prisma + SQLite

**Consequences:**
- Slight increase in transaction scope (two writes instead of one)
- Target list lookup happens outside the transaction to avoid unnecessary lock time
- Error handling distinguishes between 404 (not found) and 500 (transaction failure)

---

## Decision: Single-query activity feed with Prisma include

**Date:** 2026-04-10  
**Context:** The existing codebase had multiple N+1 query patterns (loading comments and labels per card individually).

**Decision:** Use Prisma's `include` with `select` to load all related data (actor, card, fromList, toList) in a single query, then map to a flat response shape.

**Rationale:**
- Avoids N+1 problem entirely
- Keeps the endpoint to at most 2 queries (1 membership check + 1 data fetch)
- `select` limits returned fields, reducing payload size

**Consequences:**
- Response mapping is done in application code rather than raw SQL
- Schema requires explicit back-relations on User, Board, Card, and List models
