# ADR 0003: Thin Routes, Shared Auth, And Global Error Handling

Date: 2026-04-10
Status: Accepted

## Context

The initial codebase kept authentication, authorization checks, Prisma access, and response shaping directly inside Express route files.
This created several problems:

- duplicated JWT logic across multiple routes
- hardcoded secrets embedded directly in handlers
- direct Prisma usage in route controllers
- inconsistent error handling and HTML 500 responses
- weak separation between HTTP concerns and business operations

After implementing the workshop feature, the route layer had become even more important, so the codebase needed a first hardening pass before further changes.

## Decision

The application will use a thin-route structure with shared cross-cutting infrastructure.

Specifically:

- JWT verification and token signing move to shared auth helpers
- JWT configuration moves to a shared config module
- route handlers use a shared async wrapper
- unexpected failures pass through a global JSON error handler
- business and query orchestration move from routes into service modules

## Consequences

### Positive

- production route files no longer contain direct Prisma calls
- duplicated auth logic is removed from the route layer
- response failures are more consistent and API-friendly
- the codebase is better aligned with SRP and incremental layering
- future repository extraction becomes easier because services are now an explicit seam

### Negative

- the system now has more files and indirection than the original workshop starting point
- Prisma is still used directly inside services, so the architecture is improved but not fully layered yet
- configuration still retains a local fallback secret for convenience

### Follow-Up

- introduce request validation at the route boundary
- extract persistence details into repositories or dedicated query modules
- remove insecure fallback configuration outside local development
- add unit tests for service-level business logic
