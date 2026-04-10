# Taskflow Kanban API — PRD

## Problem

The existing Kanban board API has architectural violations that make it hard to maintain and test: direct Prisma calls inside route handlers, an N+1 query on board listing, and a hardcoded JWT secret. Additionally, the product needs an Activity Feed feature so board members can see a chronological log of card movements and comments.

## Users

- **Board member**: Views boards, moves cards, adds comments, reads activity feed.
- **Developer maintaining the API**: Needs clean architecture (repository pattern) to safely add features without introducing regressions.

## Success Criteria

- Activity Feed endpoints (GET /boards/:id/activity and /preview) return correct shapes and enforce auth
- POST /cards/:id/move and POST /cards/:id/comments atomically write ActivityEvent records
- Zero direct prisma.* calls in route files — all persistence behind repository layer
- N+1 query on board listing fixed
- JWT secret loaded from environment variable, not hardcoded
- Test coverage >= 60% on new and modified files

## Components

- **Boards**: list, get, activity feed (src/routes/boards.ts -> repository)
- **Cards**: move, comment, with atomic activity writes (src/routes/cards.ts -> repository)
- **Users**: auth, login (src/routes/users.ts -> repository)
- **Activity**: new module — ActivityEvent model, repository, and routes
- **Auth middleware**: JWT verification using env-configured secret

## External Systems

- SQLite via Prisma ORM (embedded)
- JWT for authentication (secret from JWT_SECRET env var)