# ADR 0004: Request Validation At The Route Boundary

Date: 2026-04-10
Status: Accepted

## Context

After the first hardening pass, the route layer was thinner and the main business logic had moved into services.
However, route handlers still accepted unvalidated request bodies and path parameters.
That meant malformed input could reach service code and database logic, producing less predictable failures and weaker API contracts.

The next quality improvement needed to happen at the HTTP boundary.

## Decision

The application will validate route parameters and request bodies at the route boundary using typed schemas.

The initial implementation uses Zod and a shared parsing helper that converts schema failures into `400 Bad Request` application errors.

Validation now covers key request shapes for:

- user registration
- user login
- board identifiers
- board creation
- board member addition
- card creation
- card movement
- comment creation

## Consequences

### Positive

- malformed input is rejected before service and persistence logic run
- API behavior is more predictable and easier to test
- validation rules are declared close to the HTTP contract
- routes remain thin while still enforcing boundary correctness

### Negative

- route files and shared validation code gain some extra complexity
- validation rules are currently centralized but not yet versioned as full API contracts
- additional unit tests will be needed if validation logic becomes more sophisticated

### Follow-Up

- expand validation coverage to remaining route inputs
- introduce shared request/response contract documentation if the API surface grows
- add focused unit tests for validation helpers and edge cases
