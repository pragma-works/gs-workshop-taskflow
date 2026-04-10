# Activity Feed design decision

## Decision
Activity events are written inside the card repository transactions instead of being emitted from route handlers or logged in a separate follow-up step.

## Why
- `POST /cards/:id/move` must move the card and record `card_moved` as one atomic operation.
- `POST /cards/:id/comments` must create the comment and record `comment_added` without leaving partial state behind.
- Keeping activity writes in the repository lets the service layer stay orchestration-focused while Prisma handles both writes in the same transaction.

## Consequences
- The public read model is simple: board activity is fetched through a dedicated activity repository/service.
- `GET /boards/:id/activity/preview` stays read-only and unauthenticated for smoke testing.
- The API now supports the contract path `POST /cards/:id/move` while preserving the existing `PATCH /cards/:id/move` behavior.
