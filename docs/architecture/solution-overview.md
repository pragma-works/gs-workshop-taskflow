# Solution Overview

Date: 2026-04-10
Status: Current implementation after completing the workshop prompts.

## Goal

The implemented change adds a board activity feed and persists card move activity so the application can expose a chronological event stream for a board.

## Current Architecture

The application remains a small Express + TypeScript + Prisma API backed by SQLite.
The current implementation is still route-centric, but the feature now includes explicit activity persistence and automated tests.

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

The project now includes a Vitest + Supertest integration suite for the activity feed.
The tests use an in-memory SQLite datasource and validate both HTTP behavior and persistence effects.

Covered scenarios:

- unauthorized access to the authenticated feed
- activity event creation during card move
- reverse chronological ordering in preview
- rollback behavior when the move fails

## Remaining Structural Gaps

The implementation satisfies the workshop feature but does not yet complete the broader architecture goals.
The following issues remain open:

- duplicated auth helper logic across route modules
- hardcoded JWT secret in code
- direct Prisma usage inside routes
- no global error middleware
- incomplete authorization rules in several routes
- password hash exposure in user responses
- N+1 query patterns outside the new activity feed endpoints

## Recommended Next Refactor Direction

The next engineering pass should aim for thin controllers and shared infrastructure:

- move auth logic to shared middleware or utilities
- extract card movement and activity logging into an application service
- extract Prisma access into repositories or query modules
- add centralized error handling
- harden authorization and response shaping
