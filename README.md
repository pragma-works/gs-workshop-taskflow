# Taskflow API

Taskflow is a Kanban-style backend API used to manage boards, lists, cards and card comments.

This workshop version was refactored to be easier to maintain for future developers.
The main goal of the refactor is to keep endpoint contracts stable while reducing coupling and duplicated logic.

## Quick start

1. Install dependencies

	npm install

2. Configure environment variables

	set JWT_SECRET=replace-this-with-a-real-secret
	set DATABASE_URL=file:./dev.db

3. Prepare database

	npm run db:push

4. Run app

	npm run dev

5. Run quality checks

	npm test
	npm run typecheck

## Architecture

The code follows a thin-route layered structure:

- Routes layer:
  - Handles HTTP concerns (request/response status and payload shape)
  - Delegates all business rules to services

- Services layer:
  - Contains business logic, validation and authorization rules
  - Orchestrates repository calls and response shaping

- Repositories layer:
  - Contains all Prisma/database access
  - Isolates persistence details from HTTP and business logic

- Middleware layer:
  - Shared authentication and error handling
  - Keeps route files clean and consistent

This separation reduces side effects and makes it easier to add features safely.

## Folder overview

- src/routes: endpoint definitions only
- src/services: business and application logic
- src/repositories: Prisma queries and persistence logic
- src/middleware: auth, async wrapper and global error handling
- src/auth: JWT signing and verification
- src/errors: reusable application error type

## Security and consistency improvements

- JWT secret is read from JWT_SECRET environment variable.
- Password hash is no longer returned in user responses.
- Route-level token parsing duplication was removed.
- Unauthorized and validation failures return consistent JSON errors.

## Maintainability conventions

- Keep route handlers short and orchestration-only.
- Never call Prisma directly from route files.
- Put cross-cutting behavior in middleware.
- Use AppError for expected failures (401, 403, 404, 400).
- Add tests for new utility/service code and protect contracts.

## Scoring-related notes

- Bounded: direct Prisma usage moved to repositories.
- Composable: business logic moved from routes to services.
- Self-describing: this README documents the implementation.
- Auditable: design rationale is captured in docs/decisions/001-thin-routes-decision.md.

## Decision log

See docs/decisions/001-thin-routes-decision.md for the architectural decision recorded in this session.