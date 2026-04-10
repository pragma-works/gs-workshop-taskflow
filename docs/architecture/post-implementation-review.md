# Post-Implementation Review

Date: 2026-04-10
Scope: Review of the codebase after completing the workshop prompts and a first hardening pass.

## Summary

The workshop feature is implemented and working.
The codebase now supports persistent board activity events, an authenticated board activity feed, a preview endpoint, automated regression tests, shared auth/config/error handling, and a thinner route layer.
The latest hardening step also added schema-based request validation at the HTTP boundary.
The latest hardening step after that introduced repositories, service-level unit tests, and baseline mutation testing.

## What Was Added

- `ActivityEvent` Prisma model and back-relations
- transactional card movement with activity event creation
- authenticated activity feed endpoint
- preview activity feed endpoint
- automated integration tests with in-memory SQLite
- shared auth and token signing utilities
- centralized JSON error handling
- service modules for boards, cards, activity, and users
- repository modules for boards, cards, activity, and users
- sanitized user responses
- typed route-boundary request validation using Zod
- repository-local experiment log and architecture documentation

## What Improved

### Consistency

Card movement and activity logging are now stored atomically in the same Prisma transaction.

### Observability Of Domain Actions

Board activity is now stored as explicit events instead of being inferred from console output or spread across unrelated tables.

### Testability

The application can now be imported into tests without automatically starting the HTTP server.
This enabled meaningful integration tests against the API surface.

### Separation Of Concerns

Routes no longer orchestrate most database operations directly.
That logic has been moved into service modules, which reduces controller complexity and lowers the direct Prisma usage in production route files.

Services now delegate raw persistence access to repositories, creating a cleaner seam for unit tests and future persistence refactors.

### Security And Response Hygiene

User routes no longer expose password hashes.
JWT operations now flow through shared helpers instead of duplicated route-local implementations.

### Error Handling

Unhandled application and Prisma errors now pass through a global JSON error handler rather than default Express HTML responses.

### Input Safety

Route parameters and request bodies are now validated before business logic executes.
This reduces accidental invalid state transitions and produces consistent 400 responses for malformed input.

### Verifiability

The codebase now has both integration tests and service-level unit tests.
Mutation testing has also been introduced, which provides a stronger signal about which service behaviors are still weakly specified.

### Query Discipline In The New Feature

The activity feed endpoints avoid loop-based database querying and rely on relation loading.

## What Survived

The original anti-pattern list has been significantly reduced, but follow-up work still exists:

- configuration still allows a fallback JWT secret for local convenience
- Prisma is still process-global behind repositories
- request validation does not yet cover every route and still lacks a shared DTO or contract layer
- event generation is still incomplete beyond card movement
- mutation testing is in place but the score is still low enough to justify more targeted unit coverage

## Current Metrics

- Automated tests: 21
- Direct `prisma.` usages in production `src/routes`: 0
- Feature working: yes
- Current mutation score on service layer: 32.81

## Manual Verification Notes

The feature was validated by logging in, moving a card, and confirming that the event appears in the preview feed.
Rollback behavior was verified with an automated test that attempts to move a card to a non-existent list.
Application startup and type-check validation were also re-run after the hardening refactor.
Unit tests and a Stryker mutation campaign were also executed successfully.

## Recommendation

The next phase should focus on improving mutation resistance, broadening unit coverage, tightening configuration, and expanding event generation.
