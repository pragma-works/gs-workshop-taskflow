# Anti-Pattern Review — Activity Feed Implementation

**Date:** 2025-01-15  
**Task:** PM-5214 — Implement Activity Feed  
**Participant:** P049

---

## Executive Summary

During the implementation of the activity feed feature using the 5-prompt workflow, **2 out of 15** anti-patterns were fixed as a side effect, while **13 anti-patterns survived** unchanged.

### Key Finding
The prompt workflow was **narrowly scoped** to the activity feed feature implementation. This laser focus successfully delivered the feature but did not encourage broader refactoring of existing code quality issues.

---

## Anti-Patterns: Fixed vs. Survived

### ✅ FIXED (2 anti-patterns)

#### 1. **Transaction Atomicity in Card Moves** ✅
- **Location:** `src/routes/cards.ts:83-91` (original)
- **Problem:** Card update and activity logging were two separate writes outside a transaction
- **Fix Applied:** Prompt 3 explicitly required wrapping both operations in `prisma.$transaction()`
- **Result:** Card moves and activity events now succeed or fail together atomically

**Before:**
```typescript
await prisma.card.update({ where: { id: cardId }, data: { listId: targetListId, position } })
console.log(`Card ${cardId} moved from list ${fromListId} to ${targetListId} by user ${userId}`)
```

**After:**
```typescript
const event = await prisma.$transaction(async (tx) => {
  await tx.card.update({ where: { id: cardId }, data: { listId: targetListId, position } })
  const activityEvent = await tx.activityEvent.create({ data: { ... } })
  return activityEvent
})
```

#### 2. **Activity Logging to Console** ✅
- **Location:** `src/routes/cards.ts:89`
- **Problem:** Activity moves logged to `console.log` instead of database
- **Fix Applied:** Prompt 3 required creating `ActivityEvent` records in the database
- **Result:** Activity is now persisted and queryable

---

### ❌ SURVIVED (13 anti-patterns)

#### Global Scope Issues

**1. Global Prisma Singleton** ❌
- **Location:** `src/db.ts:4-5`
- **Problem:** Global singleton with no connection lifecycle management
- **Why Survived:** Not addressed by any prompt; feature implementation used existing `prisma` import
- **Impact:** Prevents graceful shutdown, connection pooling control, and test isolation

**2. No Global Error Handler** ❌
- **Location:** `src/index.ts:15`
- **Problem:** Unhandled promise rejections return HTML 500 instead of JSON
- **Why Survived:** Feature prompts focused on routes, not Express middleware
- **Impact:** Poor error UX for API consumers

---

#### Code Duplication

**3-4. Duplicated `verifyToken()` Function** ❌
- **Locations:** `src/routes/users.ts:8-14`, `src/routes/boards.ts:8-14`, `src/routes/cards.ts:8-14`, **`src/routes/activity.ts:7-13` (NEW)**
- **Problem:** Same function copy-pasted across **4 files now** (was 3, we added a 4th!)
- **Why Survived:** Prompt 4 said "use the existing verifyToken function" — interpreted as "copy the pattern"
- **Impact:** Single change requires 4 edits; maintenance burden increased

**5. Hardcoded JWT Secret** ❌
- **Locations:** `src/routes/users.ts:12`, `src/routes/boards.ts:12`, `src/routes/cards.ts:12`, **`src/routes/activity.ts:11` (NEW)**
- **Problem:** String `"super-secret-key-change-me"` appears in **4 locations now**
- **Why Survived:** Prompts didn't address configuration management
- **Impact:** Security risk; cannot rotate secrets without code changes

---

#### N+1 Query Problems

**6. Board List Endpoint N+1** ❌
- **Location:** `src/routes/boards.ts:34-39`
- **Problem:** Loops over memberships and queries board individually
- **Why Survived:** Not touched by feature work
- **Impact:** O(n) database queries for n memberships

**7. Board Detail Endpoint Catastrophic N+1** ❌
- **Location:** `src/routes/boards.ts:70-87`
- **Problem:** Nested loops: cards per list, comments per card, labels per card
- **Why Survived:** Not touched by feature work
- **Impact:** 1 + N + N×M + N×M×P queries (potentially hundreds)

**8. Card Labels N+1** ❌
- **Location:** `src/routes/cards.ts:33-37`
- **Problem:** Loops over cardLabels and fetches each label individually
- **Why Survived:** Not touched by feature work
- **Impact:** O(n) queries for n labels per card

---

#### Security & Authorization

**9. Password Hash in Registration Response** ❌
- **Location:** `src/routes/users.ts:24`
- **Problem:** POST `/users/register` returns full user object including password hash
- **Why Survived:** Not touched by feature work
- **Impact:** Sensitive data exposure

**10. Password Field in User Response** ❌
- **Location:** `src/routes/users.ts:50`
- **Problem:** GET `/users/:id` returns password field
- **Why Survived:** Not touched by feature work
- **Impact:** Sensitive data exposure

**11. No Ownership Check for Adding Members** ❌
- **Location:** `src/routes/boards.ts:128`
- **Problem:** POST `/boards/:id/members` allows any authenticated user to add members
- **Why Survived:** Not touched by feature work
- **Impact:** Authorization bypass

**12. No Ownership Check for Card Moves** ❌
- **Location:** `src/routes/cards.ts:83` (modified by Prompt 3)
- **Problem:** Any authenticated user can move any card (no board membership check)
- **Why Survived:** Prompt 3 focused on transaction atomicity, not authorization
- **Impact:** Authorization bypass — **this should have been fixed but wasn't**

**13. No Ownership Check for Card Deletion** ❌
- **Location:** `src/routes/cards.ts:126`
- **Problem:** DELETE `/cards/:id` allows any authenticated user to delete any card
- **Why Survived:** Not touched by feature work
- **Impact:** Authorization bypass

---

#### Position Management

**14. Card Position Calculation** ❌
- **Location:** `src/routes/cards.ts:54`
- **Problem:** POST `/cards` calculates position as `count` with no reordering logic
- **Why Survived:** Not touched by feature work
- **Impact:** Gaps in positions when cards are deleted; doesn't reflect visual order

---

#### Missing Functionality

**15. TODO Stubs Remain** ❌
- **Location:** Empty repository/service files
- **Files:** `src/middleware/auth.ts`, `src/repositories/*.ts`, `src/services/BoardService.ts`
- **Why Survived:** Prompts explicitly said "Do not modify any other route or file" (Prompt 3)
- **Impact:** No separation of concerns; all logic remains in route handlers

---

## Analysis: Why So Few Anti-Patterns Were Fixed

### 1. **Narrow Scope by Design**
Each prompt contained explicit constraints:
- "Do not modify any other route or file" (Prompt 3)
- "Do not write any TypeScript yet" (Prompt 2)
- "Wire the router into `src/index.ts` at path `/boards`" (Prompt 4) — specific, minimal change

### 2. **Feature-First Mindset**
The prompts optimized for:
- ✅ Getting the feature working
- ✅ Meeting explicit requirements
- ❌ Improving code quality beyond the feature

### 3. **Pattern Replication**
Prompt 4 said "use the existing verifyToken function" → AI copied the anti-pattern instead of extracting it

### 4. **No Refactoring Phase**
The 5-prompt workflow had no "cleanup" or "refactor" prompt to address technical debt

### 5. **Authorization Not Specified**
Prompt 3 required authentication but didn't mention authorization (board membership checks)

---

## What Would Have Fixed More?

### Hypothetical Prompt 6 — Refactor
```
Extract shared auth logic into `src/middleware/auth.ts`:
- Move verifyToken to a reusable middleware
- Move JWT secret to environment variable
- Add board membership verification middleware

Update all routes to use the centralized auth.
```

### Prompt 3 Enhancement
Add this requirement:
> "Before moving the card, verify the user is a member of the board that owns the card"

---

## Scoring Impact

Based on the scoring rubric:

| Property | Impact |
|----------|--------|
| **Bounded** (2 pts) | ❌ FAIL — Direct `prisma.*` calls remain in all route files (not just new ones) |
| **Composable** (3 pts) | ⚠️ RISK — Business logic still in route handlers; no service layer |
| **Defended** (1 pt) | ⚠️ RISK — Authorization bypass in card move endpoint |
| **Executable** (3 pts) | ✅ LIKELY PASS — Feature works as specified |
| **Verifiable** (2 pts) | ✅ LIKELY PASS — Tests written and passing (4/4) |

**Estimated Total:** ~5-7 out of 11 automated points (depending on hidden tests)

---

## Lessons Learned

### For Prompt Engineering
1. **Explicit constraints prevent scope creep** — but also prevent beneficial refactoring
2. **"Use existing patterns" can mean "copy anti-patterns"**
3. **Authorization should be explicitly required** in prompts touching user actions
4. **A refactoring phase would complement feature work**

### For Workshop Design
1. The scoring system rewards code quality, but the prompts don't encourage it
2. A tension exists between "ship fast" (5 prompts) and "ship well" (extract shared code)
3. Participants following prompts exactly will inherit most anti-patterns

---

## Recommendation

If the goal is to measure **prompt-guided development quality**, consider:

**Option A:** Add a 6th prompt focused on refactoring  
**Option B:** Modify Prompts 3-4 to require extracting shared code  
**Option C:** Accept that narrow prompts → narrow fixes, and measure that delta  

The current design appears to test **can AI follow instructions precisely** more than **can AI produce clean code**.

---

## Conclusion

The 5-prompt workflow successfully delivered a **working activity feed feature** with **atomic transactions** and **comprehensive tests**. However, it left **13 of 15 pre-existing anti-patterns** untouched and **introduced 1 new instance** of code duplication.

This outcome reflects the **design tension** between:
- 🎯 Focused feature delivery (achieved)
- 🧹 Broad code quality improvement (not achieved)

The workshop's scoring system will likely penalize the lack of refactoring (Bounded, Composable), even though the feature itself works correctly.

**Grade Prediction:** B- to C+ (5-7 out of 11 automated points)

---

**Log Entry Complete**  
*Next step: Review scoring rubric and decide whether to refactor before final submission*
