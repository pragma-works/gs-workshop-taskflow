# Use Cases — Taskflow Kanban API

## UC-001: Board member views Activity Feed

**Actor**: Authenticated board member
**Precondition**: Member belongs to the board. At least one activity event exists.
**Steps**:
1. Member calls GET /boards/:id/activity with a valid auth token.
2. System verifies membership; returns all activity events newest-first.
3. Response shape: { events: [{ id, boardId, cardId?, userId, action, meta?, createdAt }] }.
**Outcome**: Member sees a chronological log of all board activity.
**Error paths**: 401 if no token; 403 if not a board member; 404 if board not found.

## UC-002: Member moves a card and activity is recorded atomically

**Actor**: Authenticated board member
**Precondition**: Card exists and belongs to the board. Member has access.
**Steps**:
1. Member calls POST /cards/:id/move with { columnId } and auth token.
2. System updates the card's column and writes an ActivityEvent (action: card_moved) in a single transaction.
3. Returns 200 with updated card.
**Outcome**: Card moved; activity event persisted atomically — no partial state possible.
**Error paths**: 400 if columnId missing; 404 if card not found; 409 if transaction fails.

## UC-003: Member adds a comment and activity is recorded

**Actor**: Authenticated board member
**Precondition**: Card exists. Member is authenticated.
**Steps**:
1. Member calls POST /cards/:id/comments with { content } and auth token.
2. System creates the comment and writes an ActivityEvent (action: comment_added) atomically.
3. Returns 201 with the new comment.
**Outcome**: Comment saved; activity feed updated.
**Error paths**: 400 if content empty; 401 if unauthenticated; 404 if card not found.