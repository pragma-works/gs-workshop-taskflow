# ADR 0001: Activity Event Persistence And Atomic Card Move

Date: 2026-04-10
Status: Accepted

## Context

The workshop requires a board activity feed and an activity record for card movement.
Before this change, the application moved cards directly and only emitted a console log instead of persisting a domain event.
That meant a crash or failure between the card update and the activity log could leave the system in an inconsistent state.

The required read model also needs a chronological stream of activity that can include multiple event types such as card creation, comments, and movement.

## Decision

The system will persist explicit `ActivityEvent` records in the database.

Card movement will create an `ActivityEvent` in the same Prisma transaction as the card update.

The `ActivityEvent` model will reference:

- the board that owns the event
- the actor who caused the event
- the related card when applicable
- the source list when applicable
- the target list when applicable

## Consequences

### Positive

- board activity becomes queryable as a first-class domain concept
- card move and activity logging stay consistent under transactional failure
- the feed can support multiple event types through one stream model
- response enrichment can be handled by loading relations instead of reconstructing events from other tables

### Negative

- the schema becomes more complex
- the write path for card movement now depends on additional relations
- event creation is still triggered from a route handler because broader service extraction has not happened yet

### Follow-Up

- move transaction orchestration into an application service
- add additional event creation for comments and card creation when those behaviors are expanded
- add indexes if feed volume grows beyond workshop scale
