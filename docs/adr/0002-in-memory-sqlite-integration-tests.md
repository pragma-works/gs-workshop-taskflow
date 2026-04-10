# ADR 0002: In-Memory SQLite Integration Tests

Date: 2026-04-10
Status: Accepted

## Context

The workshop requires automated tests for the new activity feed behavior and explicitly asks not to use the real development database.
At the same time, the current codebase does not have service or repository abstractions that would support high-value unit tests without extensive mocking.

The card move behavior also relies on a real Prisma transaction, which is important to validate with a relational database engine rather than a fake stub.

## Decision

The initial automated test suite will use:

- Vitest as the test runner
- Supertest for HTTP-level API exercise
- SQLite in-memory storage for test isolation
- the real Prisma client and real Express application

The application entry point is allowed to be imported without starting the server automatically so tests can run in-process.

## Consequences

### Positive

- tests exercise the real HTTP and Prisma integration path
- transaction behavior is validated against a real database engine
- tests stay isolated from the development database
- the feedback loop remains fast enough for local development

### Negative

- the current test setup contains database bootstrap logic inside the test suite
- the approach is heavier than pure unit testing
- this does not replace the need for unit tests after logic extraction

### Follow-Up

- extract common test database setup utilities
- add unit tests once business logic is moved out of routes
- introduce mutation testing after the testing pyramid is more balanced
