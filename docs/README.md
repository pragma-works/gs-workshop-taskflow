# Documentation Index

This directory contains the live documentation for the workshop implementation and the follow-up engineering decisions.

## Architecture

- `architecture/current-state-analysis.md`: baseline analysis captured before implementing the activity feed
- `architecture/solution-overview.md`: current technical overview of the implemented solution
- `architecture/system-diagram.md`: visual runtime architecture diagram of the current backend structure
- `architecture/post-implementation-review.md`: what changed, what improved, and what risks remain after the workshop prompts
- `architecture/testing-strategy.md`: current testing approach and next testing steps

## ADRs

- `adr/0001-activity-event-persistence-and-atomic-card-move.md`: why activity is persisted as explicit domain events and why card move logging uses a transaction
- `adr/0002-in-memory-sqlite-integration-tests.md`: why the current tests use in-memory SQLite integration tests instead of mocking Prisma
- `adr/0003-thin-routes-shared-auth-and-global-error-handling.md`: why the route layer was slimmed down and shared infrastructure was introduced for auth and error handling
- `adr/0004-request-validation-at-the-route-boundary.md`: why request validation now happens at the HTTP boundary using typed schemas
- `adr/0005-repository-extraction-and-service-level-unit-tests.md`: why persistence access moved into repositories and why services now have direct unit tests
- `adr/0006-mutation-testing-baseline-with-stryker.md`: why mutation testing was introduced now and how it is scoped in the current codebase

## Experiment Log

- `experiment/group-a-prompt-log.md`: group A prompt-by-prompt execution log and observations
