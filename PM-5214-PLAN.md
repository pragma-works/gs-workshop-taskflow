# PM-5214: Activity Feed Implementation Plan

## Overview
Implement an Activity Feed feature for Kanban boards with full audit trail of card movements and comments. Estimated effort: 2-3 story points.

## Ticket Requirements

### Scope
- ✅ New endpoints: `GET /boards/:id/activity` and `GET /boards/:id/activity/preview`
- ✅ Activity logging on card move and comment addition
- ⚠️ Fix known code quality issues (bonus points)

---

## Phase 1: Setup & Schema (Preparatory)

### 1.1 Update Prisma Schema
**File:** [prisma/schema.prisma](prisma/schema.prisma)

Add `ActivityEvent` model:
```prisma
model ActivityEvent {
  id        Int      @id @default(autoincrement())
  boardId   Int
  cardId    Int?
  userId    Int
  action    String   // "card_moved", "comment_added", etc.
  meta      String?  // JSON stringified metadata
  createdAt DateTime @default(now())
  
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  card      Card?    @relation(fields: [cardId], references: [id], onDelete: SetNull)
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([boardId])
  @@index([createdAt])
}
```

Update related models:
- `Board`: Add `events BoardActivity[]`
- `Card`: Add `activities ActivityEvent[]` (optional, for convenience)
- `User`: Add `activities ActivityEvent[]`

**Database:**
```bash
npm run db:migrate -- --name add_activity_events
npm run db:seed  # if needed
```

---

## Phase 2: Refactoring (Bonus – Fix Known Issues)

### 2.1 Create Repository Layer
**New Files:**
- `src/repositories/BoardRepository.ts` — Encapsulate all board queries
- `src/repositories/CardRepository.ts` — Encapsulate all card queries/mutations
- `src/repositories/ActivityRepository.ts` — Activity-specific queries
- `src/repositories/index.ts` — Export all repositories

**Benefits:**
- Eliminates direct `prisma.*` calls from routes
- Centralizes query logic (easier to optimize N+1 issues)
- Makes transactions explicit and testable

**Example structure:**
```typescript
// src/repositories/BoardRepository.ts
export class BoardRepository {
  static async getByIdWithLists(boardId: number) {
    return prisma.board.findUnique({
      where: { id: boardId },
      include: { lists: true }  // fetch with single query
    })
  }
  
  static async getUserBoards(userId: number) {
    // Use a proper join instead of N+1
    return prisma.board.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' }
    })
  }
}
```

### 2.2 Create Shared Auth Middleware
**New File:** `src/middleware/auth.ts`

- Extract `verifyToken()` helper (currently copy-pasted 3x)
- Use environment variable for JWT secret
- Return Express middleware:
  ```typescript
  export const authMiddleware = (req, res, next) => {
    try {
      req.userId = verifyToken(req)
      next()
    } catch {
      res.status(401).json({ error: 'Unauthorized' })
    }
  }
  ```

**Update routes:**
```typescript
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.userId  // now available via middleware
  // ...
})
```

### 2.3 Fix N+1 in `GET /boards`
**File:** [src/routes/boards.ts](src/routes/boards.ts#L23)

**Current (anti-pattern):**
```typescript
for (const m of memberships) {
  const board = await prisma.board.findUnique({ where: { id: m.boardId } })
  boards.push(board)
}
```

**Fix via repository:**
```typescript
const boards = await BoardRepository.getUserBoards(userId)
```

### 2.4 Fix N+1 in `GET /boards/:id` (Full board fetch)
**File:** [src/routes/boards.ts](src/routes/boards.ts#L41)

**Current:** Queries board → lists → cards → comments per card → labels per card

**Fix via eager loading:**
```typescript
const board = await prisma.board.findUnique({
  where: { id: boardId },
  include: {
    lists: {
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            comments: { include: { user: true } },
            labels: { include: { label: true } }
          }
        }
      }
    }
  }
})
```

### 2.5 Fix Missing Transaction in `PATCH /cards/:id/move`
**File:** [src/routes/cards.ts](src/routes/cards.ts#L67)

**Current issue:** Card moves but activity doesn't → desync risk

**Fix:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.card.update({
    where: { id: cardId },
    data: { listId: targetListId, position }
  })
  
  await tx.activityEvent.create({
    data: {
      boardId,
      cardId,
      userId,
      action: 'card_moved',
      meta: JSON.stringify({ fromListId, toListId: targetListId, position })
    }
  })
})
```

---

## Phase 3: Core Feature Implementation

### 3.1 Create Activity Endpoints

#### `GET /boards/:id/activity` (Authenticated)
**File:** [src/routes/boards.ts](src/routes/boards.ts) — Add new route

```typescript
router.get('/:id/activity', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId
  const boardId = parseInt(req.params.id)
  
  // 1. Check board exists
  const board = await prisma.board.findUnique({ where: { id: boardId } })
  if (!board) return res.status(404).json({ error: 'Board not found' })
  
  // 2. Check membership
  const isMember = await prisma.boardMember.findUnique({
    where: { userId_boardId: { userId, boardId } }
  })
  if (!isMember) return res.status(403).json({ error: 'Forbidden' })
  
  // 3. Fetch activity (newest first)
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    include: { user: true, card: true }
  })
  
  res.json({ events: events.map(e => ({
    id: e.id,
    boardId: e.boardId,
    cardId: e.cardId,
    userId: e.userId,
    action: e.action,
    meta: e.meta ? JSON.parse(e.meta) : null,
    createdAt: e.createdAt,
    user: e.user  // include for client context
  })) })
})
```

#### `GET /boards/:id/activity/preview` (No Auth)
**File:** [src/routes/boards.ts](src/routes/boards.ts) — Add new route

```typescript
router.get('/:id/activity/preview', async (req: Request, res: Response) => {
  const boardId = parseInt(req.params.id)
  
  const events = await prisma.activityEvent.findMany({
    where: { boardId },
    orderBy: { createdAt: 'desc' },
    take: 10,  // limit to last 10
    include: { user: true, card: true }
  })
  
  res.json({ events: events.map(/* ... */) })
})
```

### 3.2 Update `PATCH /cards/:id/move`
**File:** [src/routes/cards.ts](src/routes/cards.ts#L67)

Add transaction wrapper and activity event creation (see Phase 2.5).

### 3.3 Update `POST /cards/:id/comments`
**File:** [src/routes/cards.ts](src/routes/cards.ts)

Find the comments endpoint and wrap:

```typescript
router.post('/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId
  const cardId = parseInt(req.params.id)
  const { content } = req.body
  
  const card = await prisma.card.findUnique({ 
    where: { id: cardId },
    include: { list: true }
  })
  if (!card) return res.status(404).json({ error: 'Card not found' })
  
  const boardId = card.list.boardId
  
  await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: { content, cardId, userId }
    })
    
    await tx.activityEvent.create({
      data: {
        boardId,
        cardId,
        userId,
        action: 'comment_added',
        meta: JSON.stringify({ commentId: comment.id })
      }
    })
    
    res.status(201).json({ comment, ok: true })
  })
})
```

---

## Phase 4: Testing & Validation

### 4.1 Unit Tests
```bash
npm test -- src/repositories/ActivityRepository.ts
npm test -- src/middleware/auth.ts
```

### 4.2 Integration Tests
```bash
# Test activity endpoints
curl -X GET http://localhost:3001/boards/:id/activity/preview
curl -X GET http://localhost:3001/boards/:id/activity -H "Authorization: Bearer <token>"

# Verify activity logged on card move
curl -X PATCH http://localhost:3001/cards/:id/move \
  -H "Authorization: Bearer <token>" \
  -d '{"targetListId": 2, "position": 1}'
# Then check GET /boards/:id/activity — new event should appear

# Verify activity logged on comment
curl -X POST http://localhost:3001/cards/:id/comments \
  -H "Authorization: Bearer <token>" \
  -d '{"content": "test"}'
```

### 4.3 Checklist
- [ ] ActivityEvent model created & migrated
- [ ] Auth middleware extracted (fixes hardcoded secret)
- [ ] Repositories created (fixes direct prisma calls)
- [ ] N+1 queries fixed in GET /boards and GET /boards/:id
- [ ] Transactions added to PATCH /cards/:id/move
- [ ] Transactions added to POST /cards/:id/comments
- [ ] `GET /boards/:id/activity` endpoint working (auth + membership check)
- [ ] `GET /boards/:id/activity/preview` endpoint working (no auth)
- [ ] Activity events logged atomically with card moves
- [ ] Activity events logged atomically with comments
- [ ] All tests pass

---

## Implementation Order (Recommended)

1. **Phase 1:** Schema update + migration (foundation)
2. **Phase 2.1–2.2:** Repository + auth middleware (unlocks bug fixes)
3. **Phase 2.3–2.5:** Fix N+1 & transactions (improves code quality)
4. **Phase 3:** Core activity endpoints (feature delivery)
5. **Phase 4:** Testing & validation

**Fast-track (features only):** Skip Phase 2, jump to Phase 1 → Phase 3 → Phase 4
**Full implementation:** All phases (+ bonus points for fixing issues)

---

## Files to Create/Modify

| File | Type | Purpose |
|------|------|---------|
| `prisma/schema.prisma` | Modify | Add ActivityEvent model |
| `src/repositories/[Name]Repository.ts` | Create (4 files) | Query abstraction |
| `src/middleware/auth.ts` | Create | Shared auth logic |
| `src/routes/boards.ts` | Modify | Activity endpoints + N+1 fix |
| `src/routes/cards.ts` | Modify | Transactions + activity logging |
| `src/db.ts` | Verify | Ensure Prisma client available |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Transaction deadlock on high concurrency | Use atomic operations; test with load tool |
| Membership check overhead | Cache or move to middleware chain |
| Large activity logs (perf) | Add pagination; index on (boardId, createdAt) |
| Accidental bypass of activity logging | Unit test all mutation endpoints |

---

## Success Criteria

✅ Activity Feed feature complete per ticket requirements  
✅ 2–3 known code issues fixed (bonus)  
✅ All tests passing  
✅ No performance regressions (N+1 fixed)
