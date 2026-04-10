# 001 - Thin routes, services, and repositories

Date: 2026-04-10

## Context

The API routes mixed HTTP concerns with business logic and direct Prisma queries.
This made authorization changes and bug fixes risky because behavior was duplicated across handlers.

## Decision

Use a layered structure:
- Routes: endpoint wiring only
- Services: business rules and authorization
- Repositories: Prisma and persistence details
- Middleware: shared auth and error handling

## Consequences

Positive:
- Lower coupling and easier testing of logic.
- Consistent auth/error behavior across endpoints.
- Route files become easier to review.

Trade-offs:
- More files and indirection for small features.
- Contributors must follow layering conventions.
