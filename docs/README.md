# Documentation Index

This directory contains the live documentation for the workshop implementation and the follow-up engineering decisions.

## Architecture

- `architecture/current-state-analysis.md`: baseline analysis captured before implementing the activity feed
- `architecture/solution-overview.md`: current technical overview of the implemented solution
- `architecture/post-implementation-review.md`: what changed, what improved, and what risks remain after the workshop prompts
- `architecture/testing-strategy.md`: current testing approach and next testing steps

## ADRs

- `adr/0001-activity-event-persistence-and-atomic-card-move.md`: why activity is persisted as explicit domain events and why card move logging uses a transaction
- `adr/0002-in-memory-sqlite-integration-tests.md`: why the current tests use in-memory SQLite integration tests instead of mocking Prisma

## Experiment Log

- `experiment/group-a-prompt-log.md`: group A prompt-by-prompt execution log and observations
