# Current State Analysis

Date: 2026-04-10
Scope: Initial assessment before implementing the activity feed workshop task.

## Purpose

This document captures the current architecture, main technical risks, and the gaps that matter for the activity feed feature. It is intended to serve as live documentation and as baseline context for later ADRs and refactors.

## System Summary

The project is a small Express + TypeScript + Prisma API backed by SQLite.
The application currently exposes user, board, and card endpoints directly from route modules.
Business logic, authentication, authorization, and persistence concerns are coupled inside the route handlers.

## Current Structure

### Entry Point

- `src/index.ts` boots Express, registers JSON parsing, and mounts the `users`, `boards`, and `cards` routers.
- There is no global error-handling middleware.

### Persistence

- `src/db.ts` exports a global Prisma client singleton.
- Route handlers call Prisma directly.
- There is no repository or service abstraction.

### Domain Model

The current Prisma schema includes these entities:

- `User`
- `Board`
- `BoardMember`
- `List`
- `Card`
- `Label`
- `CardLabel`
- `Comment`

Key relationships:

- `User` to `Board` is many-to-many through `BoardMember`.
- `Board` has many `List` records.
- `List` has many `Card` records.
- `Card` optionally belongs to an assignee `User`.
- `Card` has many `Comment` records.
- `Card` to `Label` is many-to-many through `CardLabel`.

## Route Inventory

### Users

- `POST /users/register`
- `POST /users/login`
- `GET /users/:id`

### Boards

- `GET /boards`
- `GET /boards/:id`
- `POST /boards`
- `POST /boards/:id/members`

### Cards

- `GET /cards/:id`
- `POST /cards`
- `PATCH /cards/:id/move`
- `POST /cards/:id/comments`
- `DELETE /cards/:id`

### Missing Workshop Route Surface

- `GET /boards/:id/activity`
- `GET /boards/:id/activity/preview`
- Persistent activity logging in card movement flow

## Main Architectural Findings

### 1. Route-Centric Design

The codebase is currently organized around route files only.
This keeps the project small, but it mixes transport concerns with business rules and data access.
That makes testing, reuse, and incremental refactoring harder.

### 2. Direct Prisma Usage in Routes

Route handlers query and mutate the database directly.
This increases coupling and will make it harder to introduce atomic workflows, reusable queries, and isolated unit tests.

### 3. Authentication Logic Is Duplicated

The JWT verification helper is copied across multiple route files.
The JWT secret is hardcoded in code instead of consistently sourced from configuration.

### 4. Authorization Is Inconsistent

Some endpoints verify authentication, but ownership and board membership checks are incomplete or inline.
This creates security and maintainability risks.

### 5. Query Efficiency Problems

The board detail route and card detail route contain N+1 query patterns.
The activity feed prompt explicitly requires avoiding loop-based querying, so this is an important constraint for the next implementation steps.

### 6. No Transaction Boundary for Card Move

The card move route updates the card and then only logs to console.
There is no persisted activity event and no transaction boundary.
This is the main consistency gap for the workshop feature.

### 7. Error Handling Is Weak

There is no centralized error handler.
Unexpected failures will fall through to Express defaults and may return HTML error responses.

### 8. Sensitive Data Leakage

User responses currently expose password hashes.
This is a correctness and security defect outside the workshop feature itself.

## Feature Gap: Activity Feed

The schema does not yet contain an `ActivityEvent` model.
The routing layer contains only a stub activity router with TODO comments.
The move workflow does not persist domain activity.

To support the feature, the system needs:

- an `ActivityEvent` persistence model
- relations from activity events to board, actor, card, and lists
- a feed query that enriches each event with actor and card/list display data
- a transactional move workflow so the card move and activity record succeed or fail together

## Testing Baseline

- There is no configured test framework yet.
- There are no unit or integration test files in the workspace.
- There is no mutation testing setup yet.

This means the first feature implementation should also establish a test foundation, ideally in a way that supports isolated DB-backed integration tests and future mutation testing.

## Recommended Direction

The workshop prompt can be completed directly in the existing structure, but that would preserve the route-centric coupling.
Given the extra engineering requirements for this workspace, the safer direction is to evolve toward a thin-controller design:

- routes handle HTTP concerns
- services handle use cases and transaction boundaries
- repositories encapsulate Prisma queries
- shared auth and error handling move to reusable modules

This should be done incrementally to avoid an oversized refactor during the exercise.

## Immediate Next Documentation

After schema changes start, create an ADR describing the chosen application layering and transaction strategy for activity logging.
