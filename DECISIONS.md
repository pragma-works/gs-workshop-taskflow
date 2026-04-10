# Decision Log

## 2026-04-10 - Thin routes with service and repository layers

Context:
- Route handlers contained authentication, validation, authorization and direct data access.
- Shared behaviors were duplicated and hard to evolve safely.

Decision:
- Keep HTTP concerns in routes.
- Move business rules to service modules.
- Move Prisma usage to repository modules.
- Add centralized auth and error middlewares.

Consequences:
- Changes in business logic are isolated from endpoint wiring.
- Direct database coupling in route files is removed.
- New contributors can find responsibilities faster and add features with lower regression risk.
