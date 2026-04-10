# Implementation Plan — Taskflow Kanban API Refactor & Activity Feed

> **Ticket:** PM-5214 — Activity Feed  
> **Date:** 2026-04-10  
> **Target Score:** 14/14 (8 automated + 6 live tests)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Scoring Gap Analysis](#2-scoring-gap-analysis)
3. [SOLID & Best Practices Violations](#3-solid--best-practices-violations)
4. [Target Architecture](#4-target-architecture)
5. [Implementation Phases](#5-implementation-phases)
6. [Phase 0 — Foundation & Configuration](#phase-0--foundation--configuration)
7. [Phase 1 — Repository Layer](#phase-1--repository-layer)
8. [Phase 2 — Auth Middleware Extraction](#phase-2--auth-middleware-extraction)
9. [Phase 3 — Service Layer](#phase-3--service-layer)
10. [Phase 4 — Schema Extension (ActivityEvent)](#phase-4--schema-extension-activityevent)
11. [Phase 5 — Route Refactor (Thin Controllers)](#phase-5--route-refactor-thin-controllers)
12. [Phase 6 — Activity Feed Feature](#phase-6--activity-feed-feature)
13. [Phase 7 — Error Handling](#phase-7--error-handling)
14. [Phase 8 — Tests & Coverage](#phase-8--tests--coverage)
15. [Phase 9 — Documentation & Auditable](#phase-9--documentation--auditable)
16. [File Map (Before → After)](#file-map-before--after)
17. [Scoring Checklist](#scoring-checklist)
18. [Commit Strategy](#commit-strategy)

---

## 1. Current State Analysis

### Codebase Overview

| File | LOC | Role | Issues |
|------|-----|------|--------|
| `src/index.ts` | 17 | Express app bootstrap | No error handler, no middleware separation |
| `src/db.ts` | 5 | Prisma singleton | No lifecycle management |
| `src/routes/boards.ts` | 118 | Board endpoints | Direct Prisma calls, N+1 queries, copy-pasted auth |
| `src/routes/cards.ts` | 115 | Card endpoints | Direct Prisma calls, no transactions, copy-pasted auth |
| `src/routes/users.ts` | 60 | Auth endpoints | Direct Prisma calls, password leak, copy-pasted auth |
| `src/routes/activity.ts` | 9 | Stub only | Empty — feature not implemented |
| `prisma/schema.prisma` | 82 | Data model | Missing `ActivityEvent` model |

### Current Score: **3 / 14**

| Property | Current | Max | Gap |
|----------|---------|-----|-----|
| Self-describing | 1 | 1 | — |
| Bounded | **0** | 2 | 31 direct DB calls in route files |
| Verifiable | **0** | 2 | 0 tests, no coverage |
| Defended | 1 | 1 | — (CI present, but 1 TSC error) |
| Auditable | 1 | 2 | Missing decision log |
| Composable | null | 3 | Pending — no service layer |
| Executable | null | 3 | Pending — activity endpoints missing |

---

## 2. Scoring Gap Analysis

To reach **14/14**, every item below must be satisfied:

| Property | What Earns It | Implementation Phase |
|----------|---------------|---------------------|
| **Bounded (2pts)** | Zero `prisma.*` calls in route files; all persistence behind repository layer | Phase 1, 5 |
| **Verifiable (2pts)** | All tests pass (1pt) + ≥60% line coverage (1pt) | Phase 8 |
| **Auditable (2pts)** | ≥50% conventional commits (1pt) — already met. Decision log `.md` file (1pt) | Phase 9 |
| **Composable (3pts)** | Business logic in services, not routes. Clean architecture, DI, no coupling | Phase 1, 2, 3, 5 |
| **Executable (3pts)** | Correct status codes and response shapes on every endpoint | Phase 5, 6, 7 |
| **Self-describing (1pt)** | README explains what was built | Phase 9 |
| **Defended (1pt)** | Zero TypeScript errors | Phase 0 (fix TSC error) |

---

## 3. SOLID & Best Practices Violations

### S — Single Responsibility Principle
| Violation | Location | Impact |
|-----------|----------|--------|
| Route handlers do auth, validation, DB access, business logic, and response formatting | `boards.ts`, `cards.ts`, `users.ts` | Cannot test/maintain any concern independently |
| `verifyToken()` duplicated 3 times — each copy owns the same responsibility | All 3 route files | Change JWT secret → edit 3 files |

### O — Open/Closed Principle
| Violation | Location | Impact |
|-----------|----------|--------|
| Adding activity logging requires modifying card move handler internals | `cards.ts:67-93` | Cannot extend behavior without modifying existing code |
| No middleware pipeline — auth is hardcoded inline | All route files | Adding rate limiting or audit logging requires editing every handler |

### L — Liskov Substitution Principle
| Violation | Location | Impact |
|-----------|----------|--------|
| No interfaces/abstractions for data access | `db.ts`, all routes | Cannot substitute test doubles for Prisma client |

### I — Interface Segregation Principle
| Violation | Location | Impact |
|-----------|----------|--------|
| Routes depend on full `PrismaClient` when they need only specific queries | All route files | Tight coupling to ORM; impossible to mock granularly |

### D — Dependency Inversion Principle
| Violation | Location | Impact |
|-----------|----------|--------|
| High-level route handlers import low-level `prisma` directly | All route files | Business logic coupled to infrastructure; untestable |
| Hardcoded `'super-secret-key-change-me'` in 3 files instead of config injection | `boards.ts`, `cards.ts`, `users.ts` | Security risk + violates DIP |

### Additional Anti-Patterns

| Anti-Pattern | Location | Severity |
|--------------|----------|----------|
| **N+1 Query** — board detail fetches lists, then cards, then comments, then labels in loops | `boards.ts:58-88` | High — O(N×M×K) queries |
| **N+1 Query** — card detail fetches labels one-by-one | `cards.ts:34-40` | Medium |
| **N+1 Query** — board list fetches boards one-by-one per membership | `boards.ts:38-42` | Medium |
| **No transaction** — card move + activity log are separate writes | `cards.ts:87-92` | High — data desync risk |
| **Password leak** — register and get-user return password hash | `users.ts:28, 53` | Critical — security |
| **No authorization** — any user can delete any card | `cards.ts:105-113` | High — security |
| **No authorization** — any user can add board members | `boards.ts:106-114` | Medium |
| **No global error handler** — unhandled throws return HTML 500 | `index.ts` | Medium |
| **No input validation** — body fields used without checks | All routes | High — security |
| **Server starts on import** — `app.listen()` in module scope blocks testing | `index.ts:15` | Medium — testability |

---

## 4. Target Architecture

```
src/
├── index.ts                    # App bootstrap (no listen on import)
├── server.ts                   # Calls app.listen() — entry point
├── config.ts                   # Environment config (JWT_SECRET, PORT)
├── db.ts                       # Prisma client singleton (unchanged)
├── middleware/
│   ├── auth.ts                 # JWT verification middleware
│   └── errorHandler.ts         # Global error handler
├── repositories/
│   ├── boardRepository.ts      # Board + BoardMember persistence
│   ├── cardRepository.ts       # Card + Comment + Label persistence
│   ├── userRepository.ts       # User persistence
│   └── activityRepository.ts   # ActivityEvent persistence
├── services/
│   ├── boardService.ts         # Board business logic
│   ├── cardService.ts          # Card business logic (move + activity atomically)
│   ├── userService.ts          # Auth business logic
│   └── activityService.ts      # Activity feed business logic
├── routes/
│   ├── boards.ts               # Thin controller — delegates to services
│   ├── cards.ts                # Thin controller — delegates to services
│   ├── users.ts                # Thin controller — delegates to services
│   └── activity.ts             # Activity feed endpoints
└── types/
    └── index.ts                # Shared types/interfaces
```

### Layer Rules
```
[Routes/Controllers] → [Services] → [Repositories] → [Prisma/DB]
         ↕                  ↕
    [Middleware]         [Config]
```

- **Routes** only parse request, call service, send response
- **Services** contain business rules, orchestrate repositories, handle transactions
- **Repositories** are the only files that import `prisma` — one per aggregate root
- **Middleware** handles cross-cutting concerns (auth, errors)
- Dependencies point inward only — never from repositories to routes

---

## 5. Implementation Phases

> **Order matters.** Each phase builds on the previous one.  
> Estimated phases: 10. Each phase = one or more commits.

---

### Phase 0 — Foundation & Configuration

**Goal:** Fix TypeScript error. Extract config. Separate `app` from `listen`.

**Files to create:**
- `src/config.ts` — exports `JWT_SECRET`, `PORT` from env with fallback
- `src/server.ts` — imports `app` from `index.ts`, calls `app.listen()`

**Files to modify:**
- `src/index.ts` — remove `app.listen()` call; export `app` only
- `package.json` — update `dev` and `start` scripts to use `server.ts`

**Config (`src/config.ts`):**
```typescript
export const config = {
  jwtSecret: process.env.JWT_SECRET || 'super-secret-key-change-me',
  port: parseInt(process.env.PORT || '3001', 10),
}
```

**Commit:** `chore: extract config and separate app from server startup`

---

### Phase 1 — Repository Layer

**Goal:** Encapsulate all Prisma access behind repository modules. After this phase, no route file should import `prisma`.

**Scoring impact:** Bounded (0 → 2), Composable (partial)

#### `src/repositories/userRepository.ts`
```typescript
// findByEmail(email: string): Promise<User | null>
// findById(id: number): Promise<User | null>
// create(data: { email, password, name }): Promise<User>
```

#### `src/repositories/boardRepository.ts`
```typescript
// findBoardsByUserId(userId: number): Promise<Board[]>         — single join, fix N+1
// findBoardById(boardId: number): Promise<Board | null>
// findBoardWithDetails(boardId: number): Promise<BoardWithLists | null>  — eager load lists+cards+comments+labels
// checkMembership(userId: number, boardId: number): Promise<boolean>
// createBoard(name: string, ownerId: number): Promise<Board>
// addMember(boardId: number, memberId: number): Promise<void>
```

Key: `findBoardsByUserId` replaces the N+1 loop with:
```typescript
prisma.board.findMany({
  where: { members: { some: { userId } } },
})
```

`findBoardWithDetails` replaces the nested N+1 loops with:
```typescript
prisma.board.findUnique({
  where: { id: boardId },
  include: {
    lists: {
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            comments: true,
            labels: { include: { label: true } },
          },
        },
      },
    },
  },
})
```

#### `src/repositories/cardRepository.ts`
```typescript
// findById(id: number): Promise<Card | null>
// findByIdWithDetails(id: number): Promise<CardWithDetails | null>  — includes comments, labels
// create(data: { title, description?, listId, assigneeId?, position }): Promise<Card>
// moveCard(cardId: number, targetListId: number, position: number): Promise<Card>  — used inside transaction
// delete(id: number): Promise<void>
// countByList(listId: number): Promise<number>
// createComment(data: { content, cardId, userId }): Promise<Comment>
```

#### `src/repositories/activityRepository.ts`
```typescript
// create(data: ActivityEventInput): Promise<ActivityEvent>
// findByBoardId(boardId: number, limit?: number): Promise<ActivityEventWithRelations[]>
```

**Commit:** `feat: add repository layer for all entities`

---

### Phase 2 — Auth Middleware Extraction

**Goal:** Single `verifyToken` middleware. Read secret from config. Remove 3 copies.

**Scoring impact:** Composable (partial), security fix

**File to create:** `src/middleware/auth.ts`
```typescript
import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthRequest extends Request {
  userId?: number
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header) { res.status(401).json({ error: 'Unauthorized' }); return }
  
  const token = header.replace('Bearer ', '')
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
```

**Commit:** `refactor: extract auth middleware, remove hardcoded JWT secret`

---

### Phase 3 — Service Layer

**Goal:** Business logic in services. Routes become thin controllers.

**Scoring impact:** Composable (0 → 3)

#### `src/services/userService.ts`
```typescript
// register(email, password, name): Promise<UserResponse>    — hash password, exclude password from response
// login(email, password): Promise<{ token: string }>
// getById(id: number): Promise<UserResponse | null>         — exclude password from response
```

#### `src/services/boardService.ts`
```typescript
// listForUser(userId: number): Promise<Board[]>
// getWithDetails(userId: number, boardId: number): Promise<BoardWithLists>  — membership check + eager load
// create(name: string, ownerId: number): Promise<Board>
// addMember(userId: number, boardId: number, memberId: number): Promise<void>  — ownership check
```

#### `src/services/cardService.ts`
```typescript
// getById(id: number): Promise<CardWithDetails>
// create(data: CreateCardInput): Promise<Card>
// moveCard(userId: number, cardId: number, targetListId: number, position: number): Promise<{ card, event }>
//   ↑ TRANSACTION: update card + create ActivityEvent atomically
// addComment(userId: number, cardId: number, content: string): Promise<{ comment, event }>
//   ↑ TRANSACTION: create comment + create ActivityEvent atomically
// delete(userId: number, cardId: number): Promise<void>
```

The `moveCard` method is critical — it wraps both operations in `prisma.$transaction()`:
```typescript
async moveCard(userId: number, cardId: number, targetListId: number, position: number) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId }, include: { list: true } })
    if (!card) throw new NotFoundError('Card not found')
    
    const fromListId = card.listId
    const updatedCard = await tx.card.update({
      where: { id: cardId },
      data: { listId: targetListId, position },
    })
    
    const event = await tx.activityEvent.create({
      data: {
        boardId: card.list.boardId,
        cardId,
        userId,
        action: 'card_moved',
        meta: JSON.stringify({ fromListId, toListId: targetListId }),
      },
    })
    
    return { card: updatedCard, event }
  })
}
```

#### `src/services/activityService.ts`
```typescript
// getByBoard(userId: number, boardId: number): Promise<ActivityEvent[]>  — with membership check
// getPreview(boardId: number, limit?: number): Promise<ActivityEvent[]>  — no auth, last 10
```

**Commit:** `feat: add service layer with business logic and transaction support`

---

### Phase 4 — Schema Extension (ActivityEvent)

**Goal:** Add `ActivityEvent` model to Prisma schema.

**Scoring impact:** Executable (partial)

**Modify:** `prisma/schema.prisma`

```prisma
model ActivityEvent {
  id        Int      @id @default(autoincrement())
  boardId   Int
  cardId    Int?
  userId    Int
  action    String   // "card_moved" | "comment_added"
  meta      String?  // JSON string for extra data (fromListId, toListId, etc.)
  createdAt DateTime @default(now())

  board     Board    @relation(fields: [boardId], references: [id])
  card      Card?    @relation(fields: [cardId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}
```

**Back-relations to add:**
- `Board` model: `activityEvents ActivityEvent[]`
- `Card` model: `activityEvents ActivityEvent[]`
- `User` model: `activityEvents ActivityEvent[]`

**Run:** `npx prisma db push`

**Commit:** `feat: add ActivityEvent model to schema`

---

### Phase 5 — Route Refactor (Thin Controllers)

**Goal:** Rewrite all route files to be thin controllers that delegate to services.

**Scoring impact:** Bounded (full 2pts), Composable (full 3pts)

**Rules for each route file:**
1. No `import prisma` — ever
2. No business logic — just parse request → call service → send response
3. Use `authenticate` middleware from `src/middleware/auth.ts`
4. Return proper HTTP status codes

#### `src/routes/users.ts` (rewrite)
```typescript
import { Router, Request, Response } from 'express'
import { userService } from '../services/userService'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body
  const user = await userService.register(email, password, name)
  res.status(201).json(user)  // no password hash in response
})

// ... similar thin handlers for login, getById
```

#### `src/routes/boards.ts` (rewrite)
- `GET /boards` → `boardService.listForUser(req.userId)`
- `GET /boards/:id` → `boardService.getWithDetails(req.userId, boardId)`
- `POST /boards` → `boardService.create(name, req.userId)`
- `POST /boards/:id/members` → `boardService.addMember(req.userId, boardId, memberId)`

#### `src/routes/cards.ts` (rewrite)
- `GET /cards/:id` → `cardService.getById(cardId)`
- `POST /cards` → `cardService.create(data)`
- `PATCH /cards/:id/move` → `cardService.moveCard(req.userId, cardId, targetListId, position)`
- `POST /cards/:id/comments` → `cardService.addComment(req.userId, cardId, content)`
- `DELETE /cards/:id` → `cardService.delete(req.userId, cardId)`

**Commit:** `refactor: rewrite routes as thin controllers delegating to services`

---

### Phase 6 — Activity Feed Feature

**Goal:** Implement the two new activity endpoints.

**Scoring impact:** Executable (full 3pts)

#### `src/routes/activity.ts`
```typescript
// GET /boards/:id/activity
//   - Auth required (use authenticate middleware)
//   - Verify board membership
//   - Return { events: [...] } newest-first
//   - Status: 401 (no auth), 403 (not member), 404 (board not found)

// GET /boards/:id/activity/preview
//   - No auth required
//   - Return { events: [...] } last 10, newest-first
```

**Response shape per event:**
```json
{
  "id": 1,
  "boardId": 1,
  "cardId": 3,
  "userId": 1,
  "action": "card_moved",
  "meta": "{\"fromListId\":1,\"toListId\":2}",
  "createdAt": "2026-04-10T12:00:00Z"
}
```

**Wire into `src/index.ts`:**
```typescript
import activityRouter from './routes/activity'
app.use('/boards', activityRouter)  // handles /boards/:id/activity
```

**Commit:** `feat: implement activity feed endpoints (GET /boards/:id/activity)`

---

### Phase 7 — Error Handling

**Goal:** Add global error handler. Define custom error classes.

**Scoring impact:** Executable (robustness), Defended

**File to create:** `src/middleware/errorHandler.ts`
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(404, message) }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(403, message) }
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
```

**Register in `src/index.ts`** as the last middleware.

**Commit:** `feat: add global error handler and custom error classes`

---

### Phase 8 — Tests & Coverage

**Goal:** Tests pass + ≥60% line coverage.

**Scoring impact:** Verifiable (0 → 2)

**Test framework:** Vitest (already in `devDependencies`)

**Test files to create:**

| File | Covers | Priority |
|------|--------|----------|
| `src/routes/activity.test.ts` | Activity feed endpoints | High |
| `src/routes/cards.test.ts` | Card move + comment with activity | High |
| `src/routes/boards.test.ts` | Board listing, detail, membership | Medium |
| `src/routes/users.test.ts` | Register (no password leak), login | Medium |
| `src/services/cardService.test.ts` | Transaction atomicity | High |
| `src/middleware/auth.test.ts` | Token verification | Medium |

**Testing approach:**
- Use `supertest` (already in devDependencies) for HTTP integration tests
- Use a separate test Prisma client with SQLite in-memory or test DB
- Set `NODE_ENV=test` to prevent server from binding port
- Seed test data in `beforeEach`, clean in `afterEach`

**Key test cases (from use cases and scoring rubric):**

```
Activity Feed:
  ✓ GET /boards/:id/activity returns 401 without auth
  ✓ GET /boards/:id/activity returns 403 for non-member
  ✓ GET /boards/:id/activity returns 404 for non-existent board
  ✓ GET /boards/:id/activity returns events newest-first
  ✓ GET /boards/:id/activity/preview returns max 10 events without auth

Card Move:
  ✓ PATCH /cards/:id/move creates ActivityEvent atomically
  ✓ PATCH /cards/:id/move returns 404 for non-existent card
  ✓ PATCH /cards/:id/move returns 401 without auth

Comments:
  ✓ POST /cards/:id/comments creates ActivityEvent atomically
  ✓ POST /cards/:id/comments returns 400 if content empty

Security:
  ✓ POST /users/register does not return password hash
  ✓ GET /users/:id does not return password hash

Bounded:
  ✓ No route file imports prisma (structural test via grep)
```

**Commit:** `test: add integration tests for all endpoints (≥60% coverage)`

---

### Phase 9 — Documentation & Auditable

**Goal:** Update README, create decision log.

**Scoring impact:** Self-describing (maintain 1pt), Auditable (1 → 2)

#### Update `README.md`
- Describe the Activity Feed feature
- Document all endpoints
- Include setup instructions

#### Create `docs/adrs/ADR-001-repository-pattern.md`
Decision log documenting the choice to use the Repository pattern:
- Context: 31 direct Prisma calls in route files, N+1 queries, untestable
- Decision: Repository layer abstracts all Prisma access
- Consequences: Testable services, fixable N+1, single point to change DB access

**Commit:** `docs: update README and add ADR-001 for repository pattern decision`

---

## File Map (Before → After)

```
BEFORE                          AFTER
──────                          ─────
src/
├── index.ts (app + listen)     ├── index.ts (app only, with error handler)
├── db.ts                       ├── server.ts (entry point, calls listen)
├── routes/                     ├── config.ts
│   ├── boards.ts (fat)         ├── db.ts
│   ├── cards.ts (fat)          ├── middleware/
│   ├── users.ts (fat)          │   ├── auth.ts
│   └── activity.ts (stub)      │   └── errorHandler.ts
                                ├── repositories/
                                │   ├── boardRepository.ts
                                │   ├── cardRepository.ts
                                │   ├── userRepository.ts
                                │   └── activityRepository.ts
                                ├── services/
                                │   ├── boardService.ts
                                │   ├── cardService.ts
                                │   ├── userService.ts
                                │   └── activityService.ts
                                ├── routes/
                                │   ├── boards.ts (thin)
                                │   ├── cards.ts (thin)
                                │   ├── users.ts (thin)
                                │   └── activity.ts (implemented)
                                └── types/
                                    └── index.ts
```

---

## Scoring Checklist

Use this checklist to verify all 14 points before final push:

### Automated (8 pts — scored on every push)

- [ ] **Self-describing (1pt):** `README.md` updated with feature description, >300 chars
- [ ] **Bounded (2pt):** `grep -r "prisma" src/routes/` returns zero matches
- [ ] **Verifiable (2pt):** `npm test` passes (1pt) + `npm run test:coverage` ≥60% (1pt)
- [ ] **Defended (1pt):** `npx tsc --noEmit` returns 0 errors
- [ ] **Auditable (2pt):** ≥50% conventional commits (1pt) + `docs/adrs/ADR-001-*.md` exists (1pt)

### Live Tests (6 pts — scored after session)

- [ ] **Executable (3pt):**
  - [ ] `GET /boards/:id/activity` — returns `{ events: [...] }` with correct shape
  - [ ] `GET /boards/:id/activity/preview` — returns last 10 events, no auth
  - [ ] `PATCH /cards/:id/move` — returns `{ ok: true, event: {...} }`
  - [ ] `POST /cards/:id/comments` — creates comment + activity atomically
  - [ ] All error paths return correct HTTP status codes (401, 403, 404)
- [ ] **Composable (3pt):**
  - [ ] No business logic in route handlers
  - [ ] Repository layer used for all DB access
  - [ ] Services handle transactions and orchestration
  - [ ] Auth middleware, not inline token parsing
  - [ ] No tight coupling between modules

---

## Commit Strategy

Follow conventional commits. Aim for one commit per phase.

```
chore: extract config and separate app from server startup        # Phase 0
feat: add repository layer for all entities                       # Phase 1
refactor: extract auth middleware, remove hardcoded JWT secret     # Phase 2
feat: add service layer with business logic and transaction support # Phase 3
feat: add ActivityEvent model to schema                            # Phase 4
refactor: rewrite routes as thin controllers delegating to services # Phase 5
feat: implement activity feed endpoints                            # Phase 6
feat: add global error handler and custom error classes            # Phase 7
test: add integration tests for all endpoints                      # Phase 8
docs: update README and add ADR-001 for repository pattern         # Phase 9
```

> **Rule:** Every commit must leave the build green (`npx tsc --noEmit` passes).  
> **Rule:** Never commit a partial migration — routes should not reference both prisma and repositories.

---

## Dependencies Between Phases

```
Phase 0 (Config)
    │
    ├──→ Phase 1 (Repositories) ──→ Phase 3 (Services) ──→ Phase 5 (Route Refactor)
    │                                       │
    └──→ Phase 2 (Auth Middleware) ─────────┘
                                            │
                            Phase 4 (Schema) ──→ Phase 6 (Activity Feed)
                                                        │
                                            Phase 7 (Error Handling)
                                                        │
                                            Phase 8 (Tests)
                                                        │
                                            Phase 9 (Docs)
```

Phases 1, 2, and 4 are independent and can be done in parallel.  
Phases 3 and 5 depend on 1 + 2.  
Phase 6 depends on 3 + 4.  
Phases 7–9 are sequential after 6.
