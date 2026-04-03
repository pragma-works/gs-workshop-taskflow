# Use Cases — taskflow-B

## UC-001: Move a Card Across Lists

**Actor**: Authenticated Team Member
**Precondition**: Actor holds a valid JWT and is a member of the board that owns the
card. At least two lists exist on the board.
**Steps**:
1. Actor sends `POST /cards/:id/move` with `{ targetListId, position }`.
2. System validates the JWT and retrieves the card.
3. System executes an atomic transaction: updates the card's `listId` and `position`,
   then writes an `ActivityEvent` of type `card_moved` with before/after list IDs.
4. System returns `{ ok: true, event: ActivityEvent }`.
**Outcome**: Card appears in the target list at the specified position; the activity
feed for the board records the move. If the transaction fails, both writes are rolled
back — no desync between card state and activity log.

## UC-002: View Board Activity Feed

**Actor**: Authenticated Board Member
**Precondition**: Actor holds a valid JWT and is a member of the board.
**Steps**:
1. Actor sends `GET /boards/:id/activity` with a Bearer token.
2. System verifies membership and fetches all ActivityEvents for the board, ordered
   by `createdAt` descending.
3. System returns `ActivityEvent[]`.
**Outcome**: Actor sees a reverse-chronological audit trail of all activity on the board.

## UC-003: Preview Activity Without Authentication

**Actor**: Developer / API consumer (unauthenticated, non-production use)
**Precondition**: At least one ActivityEvent exists for the board.
**Steps**:
1. Developer sends `GET /boards/:id/activity/preview` without an Authorization header.
2. System fetches the most recent 20 ActivityEvents for the board without checking auth.
3. System returns the event list.
**Outcome**: Developer can inspect the activity feed during local development and
integration testing without managing tokens.
