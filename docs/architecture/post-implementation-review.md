# Post-Implementation Review

Date: 2026-04-10
Scope: Review of the codebase after completing the workshop prompts for the activity feed.

## Summary

The workshop feature is implemented and working.
The codebase now supports persistent board activity events, an authenticated board activity feed, a preview endpoint, and automated regression tests for the main feature behavior.

## What Was Added

- `ActivityEvent` Prisma model and back-relations
- transactional card movement with activity event creation
- authenticated activity feed endpoint
- preview activity feed endpoint
- automated integration tests with in-memory SQLite
- repository-local experiment log and architecture documentation

## What Improved

### Consistency

Card movement and activity logging are now stored atomically in the same Prisma transaction.

### Observability Of Domain Actions

Board activity is now stored as explicit events instead of being inferred from console output or spread across unrelated tables.

### Testability

The application can now be imported into tests without automatically starting the HTTP server.
This enabled meaningful integration tests against the API surface.

### Query Discipline In The New Feature

The activity feed endpoints avoid loop-based database querying and rely on relation loading.

## What Survived

The original anti-pattern list is only partially improved.
The following problems still exist and should be treated as follow-up work:

- JWT secret hardcoded in multiple places
- duplicated token verification logic
- direct Prisma calls in route handlers
- no global error handler
- passwords returned in user responses
- authorization gaps for board membership, deletion, and member administration
- N+1 query patterns in board and card detail endpoints

## Current Metrics

- Automated tests: 4
- Direct `prisma.` usages in `src/routes`: 42
- Feature working: yes

## Manual Verification Notes

The feature was validated by logging in, moving a card, and confirming that the event appears in the preview feed.
Rollback behavior was verified with an automated test that attempts to move a card to a non-existent list.

## Recommendation

The next phase should focus on structural hardening rather than adding more features directly into route files.
Priority should go to configuration centralization, auth reuse, route slimming, and safer response contracts.
