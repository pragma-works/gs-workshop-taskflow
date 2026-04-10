# Decision: activity feed uses services and repositories

**Date**: 2026-04-10

## Context

The workshop starter repo implemented most behavior directly in Express route files. That made the new Activity Feed risky to add because authentication, authorization, persistence, and response shaping were tightly coupled. It also violated the scoring rule that route handlers should not call Prisma directly.

## Decision

The Activity Feed work was implemented with a small composition root plus explicit service and repository layers:

- routes parse HTTP input and return HTTP responses
- services enforce membership, ownership, and transactional behavior
- repositories own all Prisma access
- authentication is centralized behind a shared token service driven by environment config

## Consequences

- route files stay thin and no longer contain direct Prisma calls
- card move and comment workflows can write activity events atomically
- auth behavior is consistent across boards, cards, and users
- tests can create an app with an isolated SQLite database for each scenario
- the codebase is easier to extend with new board activity types without pushing more logic into Express handlers
