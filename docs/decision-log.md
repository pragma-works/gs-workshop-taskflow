# Decision Log

## 2026-04-10 - Introduce route-service-repository layering

Context:
The API routes were tightly coupled to Prisma calls, auth logic was duplicated across route files, and move-card activity logging was not transactional.

Decision:
Adopt a layered structure where routes only handle HTTP concerns, services enforce business rules, and repositories encapsulate data access. Add shared auth and error middleware.

Consequences:
- Route files no longer depend on direct DB calls.
- Card move and activity write are performed atomically in one transaction.
- Activity feed queries are centralized and shaped consistently.
- End-to-end tests now validate auth, ordering, and rollback behavior against SQLite.
