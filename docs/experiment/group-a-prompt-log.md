# Group A Prompt Log

Date: 2026-04-10
Participant ID: P008
Group: A
Project: taskflow

## Purpose

This document records the prompt-by-prompt observations requested by the workshop guide and preserves the execution context inside the repository as live documentation.

## Prompt 1

### Prompt Goal

Read the current system and produce a structural report of the codebase.

### Expected Output

A complete structural analysis of the current system, including entities, routes, anti-patterns, and missing pieces needed for the activity feed.

### What I Would Change In The Prompt

I would explicitly ask for a short architectural risk summary and a recommendation on whether the feature should be implemented directly in routes or through a service layer.

### What Happened

The prompt was enough to identify the current structure, the route inventory, the missing `ActivityEvent` model, and the main anti-patterns already present in the codebase.

## Prompt 2

### Prompt Goal

Extend the Prisma schema to support the activity feed.

### Expected Output

A schema extension with an `ActivityEvent` model and the necessary relations to existing entities.

### What I Would Change In The Prompt

I would explicitly ask for index guidance and relation naming conventions, because multiple references to `List` can become ambiguous without clear names.

### What Happened

The schema was extended successfully with `ActivityEvent` and the required back-relations on the existing models.

## Prompt 3

### Prompt Goal

Rewrite card movement so the card move and the activity log are stored atomically.

### Expected Output

An authenticated endpoint that updates the card and creates an activity event in the same Prisma transaction.

### What I Would Change In The Prompt

I would explicitly require validation of the target list and define the exact expected failure behavior, because transactionality alone does not fully describe correctness.

### What Happened

The move endpoint was updated to use a single Prisma transaction and now returns the created `ActivityEvent` on success.

## Prompt 4

### Prompt Goal

Implement the authenticated and preview activity feed endpoints.

### Expected Output

Two endpoints returning enriched activity events in reverse chronological order without loop-based database access.

### What I Would Change In The Prompt

I would require a shared auth helper instead of more route-local authentication logic, and I would define the response contract more explicitly including nullable fields.

### What Happened

The activity feed endpoints were implemented and mounted under `/boards`, using relation loading instead of loop-based queries.

## Prompt 5

### Prompt Goal

Add automated tests for the activity feed behavior.

### Expected Output

Integration-style tests covering unauthorized access, transactional move behavior, reverse chronological preview ordering, and rollback behavior, all using an isolated in-memory SQLite database.

### What I Would Change In The Prompt

I would explicitly request test bootstrapping details, a `test` script in `package.json`, and a requirement that the application be importable without starting a real HTTP server process.

### What Happened

Vitest and Supertest were added, the app entry point was made testable, and the requested scenarios were covered with an in-memory SQLite-backed test suite.

## Final Results

### Metrics

- Test count at workshop completion: 4
- Direct Prisma calls remaining in `src/routes` at workshop completion: 42
- Feature working: Y

### Functional Validation

The feature was validated end-to-end by:

- authenticating as `alice@test.com`
- moving a card with `PATCH /cards/1/move`
- confirming the event appears in `GET /boards/1/activity/preview`

### Observation About The Process

The prompts were sufficient to implement the feature, but additional engineering judgment was needed to make the result testable, consistent, and maintainable.

## Post-Workshop Hardening

After completing the requested exercise and validating the README checks, an additional hardening pass was performed to align the codebase with stronger engineering standards.

### Additional Improvements

- shared JWT configuration and token helpers were introduced
- route handlers were slimmed down and delegated to service modules
- global JSON error handling was added
- typed request validation was added at the route boundary
- Prisma access was extracted into repository modules
- user responses were sanitized to avoid exposing password hashes
- authorization rules were tightened for board access and membership-sensitive operations
- integration test helpers were extracted and the test suite was expanded
- service-level unit tests were added
- mutation testing was configured and executed with Stryker
- architecture documentation, ADRs, and a system diagram were added

### Updated Metrics After Hardening

- Automated tests: 11
- Automated tests after repository extraction and unit tests: 21
- Direct Prisma calls remaining in production `src/routes`: 0
- TypeScript type-check: passing
- Application startup: passing
- Service-layer mutation score: 32.81

### Documentation Added

- `docs/README.md`
- `docs/architecture/solution-overview.md`
- `docs/architecture/system-diagram.md`
- `docs/architecture/post-implementation-review.md`
- `docs/architecture/testing-strategy.md`
- `docs/adr/0001-activity-event-persistence-and-atomic-card-move.md`
- `docs/adr/0002-in-memory-sqlite-integration-tests.md`
- `docs/adr/0003-thin-routes-shared-auth-and-global-error-handling.md`
- `docs/adr/0004-request-validation-at-the-route-boundary.md`
- `docs/adr/0005-repository-extraction-and-service-level-unit-tests.md`
- `docs/adr/0006-mutation-testing-baseline-with-stryker.md`

### Validation Coverage Added After Hardening

- invalid registration payloads now return 400
- invalid route parameters now return 400
- invalid card movement payloads now return 400
- invalid empty comments now return 400

This made the API safer at the boundary and reduced the amount of invalid input reaching service and persistence logic.

### Additional Verification Added After Hardening

- service-layer unit tests now run independently from HTTP integration tests
- mutation testing now runs against the service layer using Stryker
- the first mutation report highlighted remaining weak spots, especially around `activity-service` coverage and some branch/message assertions


### Final Internal Observation

The original prompts were enough to deliver the feature, but they were not enough to reach a clean, maintainable, and defendable implementation by themselves. The best results came from treating the prompts as a delivery baseline and then applying an explicit hardening pass for architecture, safety, testing, and documentation.

## Notes

This log complements the architecture analysis in `docs/architecture/current-state-analysis.md` and can be used as the team's internal record for the workshop exercise.