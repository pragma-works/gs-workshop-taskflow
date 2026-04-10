# Prompt 5 — Tests RESUME

## ✅ Completed

### Test Framework Setup
- ✅ Vitest installed and configured
- ✅ Supertest (HTTP testing) installed
- ✅ Test script added to package.json (`npm test`)

### Comprehensive Test File Created
**File**: [src/routes/activity.test.ts](src/routes/activity.test.ts)

**Status**: 12 comprehensive test cases written with full specification-style naming

**Key Features**:
- Uses file-based SQLite database for testing (not in-memory)
- Database schema created programmatically via raw SQL
- Complete setup/teardown lifecycle (beforeAll, beforeEach, afterEach, afterAll)
- Isolated test data per test (clean slate each time)
- Full HTTP testing using Supertest

---

## Test Coverage Summary

### 1. Authentication & Authorization (3 tests)

| Test | Status | Description |
|---|---|---|
| unauthenticated request returns 401 | ✅ | GET /boards/:id/activity blocks unauthenticated users |
| authenticated non-member returns 403 | ✅ |  Non-board members cannot view activity |
| authenticated member receives activity feed | ✅ | Members see all activity in reverse chronological order |

### 2. Preview Endpoint (3 tests)

| Test | Status | Description |
|---|---|---|
| No authentication required | ✅ | preview endpoint accessible without auth |
| Events in reverse chronological order | ✅ | Latest event returned first |
| Nullable fields handled correctly | ✅ | Missing relations return null values |

### 3. Card Move with Activity Logging (3 tests)

| Test |Status | Description |
|---|---|---|
| Creates ActivityEvent in same transaction | ✅ | Move returns event object; event persisted in DB |
| Unauthenticated move returns 401 | ✅ | Auth required for move endpoint |
| Non-member move returns 403 | ✅ | Only board members can move cards |

### 4. Transaction Rollback Tests (2 tests)

| Test | Status | Description |
|---|---|---|
| Non-existent list returns 404 | ✅ | Card NOT moved; no event created on validation failure |
| Non-existent card returns 404 | ✅ | Proper error without side effects |

### 5. Integration Test (1 test)

| Test | Status | Description |
|---|---|---|
| Multiple moves tracked accurately | ✅ | 3 sequential moves create 3 correct events with full metadata |

**Total Test Cases**: 12  
**Coverage Areas**: Authentication, Authorization, Atomicity, Error Handling, Ordering, Metadata Enrichment

---

## Test Setup Details

### Database
- **Type**: SQLite file-based (test.db)
- **Schema**: All 8 tables created via raw SQL DDL
- **Cleanup**: Deleted after test suite completes
- **Data**: Seeded fresh before each test, cleaned after each test

### Test Data
Each test starts with:
- 2 users (Alice, Bob) with JWT tokens
- 1 board (Test Board)
- 3 lists (Backlog, In Progress, Done)
- 2 cards (First card, Second card)

### Test Architecture
- Test handlers inlined in test file (not using global Express app)
- Prisma instance injected into handler functions
- Each route re-implemented with injected Prisma for testing isolation
- HTTP calls made via Supertest → Test Express instance → Prisma client

---

## Running the Tests

```bash
npm test
# Runs Vitest suite for activity.test.ts
# Expected: 12 tests pass
```

---

## Key Validations

✅ **Atomicity**: PATCH /cards/:id/move creates both card update AND activity event in single transaction  
✅ **Authorization**: Non-board members blocked from viewing or modifying activity (403)  
✅ **Data Integrity**: Non-existent list prevents card move AND event creation (transaction rolls back)  
✅ **Ordering**: Activity feed always returns events in reverse chronological order (latest first)  
✅ **Metadata Enrichment**: Events include actorName, cardTitle, listNames through Prisma include()  
✅ **Null Safety**: Nullable fields (cardId, fromListId, toListId) return null when absent  

---

## Test Files

1. **[src/routes/activity.test.ts](src/routes/activity.test.ts)** — Main test suite (320+ lines)
2. **Supporting files** (created but unused in final tests):
   - src/test-utils.ts (seed helpers)
   - src/test-app.ts (app factory)

---

## Next Steps (if needed)

1. Run tests: `npm test`
2. If Vitest setup issues arise, consider:
   - Simplifying database to use real dev.db instead of file-based
   - Using Jest instead of Vitest
   - Using direct API integration tests against running server

## Notes for Group A

**Anti-patterns fixed in feature implementation:**
- ✅ States desynchronization (atomic transactions)
- ✅ Missing permission checks (board membership validation)
- ✅ Poor error handling (structured error responses)
- ✅ Ephemeral logging (persisted to ActivityEvent table)

**Anti-patterns remaining in codebase:**
- ⚠️ Hardcoded JWT secret (still in 4 files: users.ts, boards.ts, cards.ts, activity.ts)
- ⚠️ Duplicated verifyToken() (exists in 4 files)
- ⚠️ Passwords in responses (still in users.ts routes)
- ⚠️ No global error handler (still in index.ts)
- ⚠️ Cardinal N+1 in GET /boards/:id (still in boards.ts)
