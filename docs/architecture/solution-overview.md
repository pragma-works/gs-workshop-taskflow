# Solution Overview

Date: 2026-04-10
Status: Current implementation after the workshop prompts and a first hardening pass.

## Goal

The implemented change adds a board activity feed and persists card move activity so the application can expose a chronological event stream for a board.

## Current Architecture

The application remains a small Express + TypeScript + Prisma API backed by SQLite.
The current implementation now uses thinner route handlers, shared auth/config/error infrastructure, and service modules for business operations.

## Structural Layers

### Routes

Route files are now responsible primarily for:

- parsing request input
- obtaining the authenticated user id
- selecting HTTP status codes
- delegating use-case logic to services

### Shared Infrastructure

The application now includes:

- shared JWT configuration
- shared token verification and token signing helpers
- a reusable async route wrapper
- a global JSON error handler

### Services

Use-case and query orchestration now live in dedicated service modules:

- board service
- card service
- activity service
- user service

These services still use Prisma directly, but they remove database orchestration from the route layer and create a better base for future repository extraction.

## Implemented Activity Feed Flow

### Persistence Model

The schema now includes `ActivityEvent` with references to:

- `Board`
- `User` as actor
- `Card`
- `List` as `fromList`
- `List` as `toList`

This enables one event stream for multiple activity types instead of deriving activity indirectly from existing entities.

### Write Flow

The `PATCH /cards/:id/move` endpoint now:

- authenticates the caller
- loads the card and its current board context
- updates the card location and position
- writes a `card_moved` activity event
- performs both writes in a single Prisma transaction

This reduces the desynchronization risk between board state and activity history.

### Read Flow

The activity router exposes:

- `GET /boards/:id/activity` for authenticated board members
- `GET /boards/:id/activity/preview` for no-auth testing

Both endpoints load events in reverse chronological order and enrich each event with related display data:

- actor name
- card title
- from-list name
- to-list name

The authenticated endpoint uses one membership query plus one events query.
The preview endpoint uses one events query.

## Testing Outcome

The project now includes a Vitest + Supertest integration suite using shared in-memory SQLite test helpers.
The tests validate both HTTP behavior and persistence effects.

Covered scenarios:

- unauthorized access to the authenticated feed
- activity event creation during card move
- reverse chronological ordering in preview
- rollback behavior when the move fails
- forbidden access for non-members
- sanitized register responses
- sanitized user lookup responses

## Remaining Structural Gaps

The implementation now addresses the most critical route-level anti-patterns but does not yet complete the broader architecture goals.
The following issues remain open:

- Prisma is still used directly inside services rather than repositories
- the Prisma client is still process-global
- request payloads are not validated with a schema library
- activity events are only written for card movement, not yet for comments or card creation
- mutation testing is still pending
- JWT configuration still uses a fallback secret when the environment variable is absent

## Recommended Next Refactor Direction

The next engineering pass should aim for deeper modularity and stronger contracts:

- introduce request validation at the route boundary
- extract Prisma access into repositories or query modules
- remove fallback secrets from configuration for non-local environments
- extend event generation to additional domain actions
- add mutation testing once the domain logic is more isolated
