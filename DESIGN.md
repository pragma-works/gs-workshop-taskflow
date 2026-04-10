# Activity Feed Design Decision

## Context
We needed to add an Activity Feed feature to the Kanban board to track user actions (card moves, comments) for auditing and visibility.

## Decision
We implemented the Activity Feed using a layered architecture with the following key design choices:

### 1. Database Schema
- Added `ActivityEvent` model to Prisma schema with fields: `id`, `boardId`, `cardId`, `userId`, `action`, `meta`, `createdAt`
- Added index on `(boardId, createdAt)` for efficient querying
- Used optional `meta` field (JSON string) for extensible metadata storage

### 2. Repository Layer
Created dedicated repositories to abstract database operations:
- `ActivityRepository` - for activity event CRUD
- `BoardRepository` - for board operations and membership checks  
- `CardRepository` - for card operations
- `CommentRepository` - for comment operations
- `UserRepository` - for user operations

This satisfies the **Bounded** requirement (no direct `prisma.*` calls in routes).

### 3. Service Layer
Created services for business logic:
- `ActivityService` - handles activity feed retrieval with authorization checks
- `CardService` - handles card operations with transactional activity logging

This satisfies the **Composable** requirement (business logic in services, not routes).

### 4. Transactional Integrity
Used Prisma transactions (`prisma.$transaction`) to ensure atomicity when:
- Moving a card + logging activity event
- Adding a comment + logging activity event

This prevents state desynchronization if one operation fails.

### 5. Authentication Middleware
Created centralized `auth.ts` middleware with:
- `verifyToken()` - validates JWT tokens
- `authenticate()` - Express middleware for auth
- `generateToken()` - creates JWT tokens
- JWT secret from environment variable (not hardcoded)

### 6. API Endpoints
Implemented as specified:
- `GET /boards/:id/activity` - authenticated, returns all events
- `GET /boards/:id/activity/preview` - no auth, returns last 10 events
- Modified `POST /cards/:id/move` - atomic transaction with activity logging
- Modified `POST /cards/:id/comments` - atomic transaction with activity logging

## Fixed Issues
1. **Direct Prisma calls** - Moved to repositories
2. **Hardcoded JWT secret** - Now uses `process.env.JWT_SECRET`
3. **N+1 queries** - BoardRepository uses proper Prisma includes/joins
4. **Missing transactions** - Card move and comment operations now use transactions
5. **Password exposure** - User responses now exclude password field

## Trade-offs
- **Metadata as JSON string**: Using `meta` as a String instead of JSON type provides better SQLite compatibility, though it requires manual JSON.stringify/parse
- **No migration rollback**: Schema change is forward-only (acceptable for workshop scope)
- **Simplified auth**: No role-based authorization on all endpoints (noted as TODO in code)

## Consequences
- All route files now follow clean architecture principles
- Business logic is testable independently of HTTP layer
- Activity logging is atomic and reliable
- System is prepared for future features (notifications, undo, etc.)
- Code coverage and maintainability improved significantly
