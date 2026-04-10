# ADR 0005: Repository Extraction And Service-Level Unit Tests

Date: 2026-04-10
Status: Accepted

## Context

After introducing thin routes and service modules, the services still depended directly on Prisma.
That was an improvement over route-level Prisma access, but it still made isolated unit testing awkward and left the service layer tightly coupled to persistence details.

The next improvement needed a seam between business decisions and raw database operations.

## Decision

Persistence access is extracted into repository modules.

Services now depend on repositories and accept injectable dependencies so core business behavior can be tested without a live Prisma client.

This change is intentionally incremental:

- repositories wrap Prisma access
- services orchestrate business rules
- routes remain focused on HTTP concerns

## Consequences

### Positive

- service logic is easier to unit test in isolation
- persistence concerns are more centralized
- future database refactors are less invasive to service code
- the design is closer to SRP and a layered architecture

### Negative

- the codebase now has more abstraction and more files
- repositories are still thin wrappers over Prisma rather than rich domain adapters
- some service logic still depends on imported cross-service helpers that may later need further decoupling

### Follow-Up

- improve dependency composition for cross-service authorization helpers
- introduce repository contract tests where behavior becomes non-trivial
- keep shrinking service-to-infrastructure coupling in future refactors
