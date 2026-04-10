# ADR-001: Activity Feed Layering and Atomic Event Writes

## Status
Accepted

## Context
PM-5214 requires a board activity feed plus event creation when cards move and comments are added.
The previous route implementation contained direct database calls and multi-step writes without a transaction.

## Decision
1. Keep route handlers thin and move behavior into a service layer.
2. Isolate persistence concerns in a repository layer.
3. Create activity events from card move/comment flows within a single transaction so the audit trail cannot diverge from card state.
4. Expose a public preview feed endpoint limited to 10 events for smoke testing.

## Consequences
- Better separation of concerns and easier testability.
- Reduced N+1 behavior by loading board details with include trees.
- Slightly more indirection (route -> service -> repository), but safer and more maintainable.
