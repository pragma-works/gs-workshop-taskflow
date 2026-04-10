/**
 * Integration tests — Activity Feed feature
 *
 * Stack  : Vitest 3 + supertest (repo's existing test dependencies)
 * DB     : isolated prisma/test.db (set in vitest.config.ts env)
 * HTTP   : supertest against the Express app (no port binding)
 *
 * Suites
 *  1. GET /boards/:id/activity          (auth required)
 *  2. GET /boards/:id/activity/preview  (no auth)
 *  3. PATCH /cards/:id/move             (+ activity event creation)
 *  4. Atomicity / rollback              (transaction failure -> state unchanged)
 *  5. Security regression               (no password fields in responses)
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { agent, provisionDb, getToken, createTempUser, seedEvent, prisma } from './helpers'

// --- Global setup ------------------------------------------------------------

let aliceToken: string

beforeAll(async () => {
  provisionDb()
  aliceToken = await getToken('alice@test.com', 'password123')
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Suite 1: GET /boards/:id/activity ---------------------------------------

describe('GET /boards/:id/activity', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany()
  })

  it('returns 401 without auth token', async () => {
    const res = await agent.get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 200 with empty array when no events exist', async () => {
    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 403 for a user who is not a board member', async () => {
    const { id, token: outsiderToken } = await createTempUser('outsider@test.com', 'Outsider')

    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${outsiderToken}`)

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })

    await prisma.user.delete({ where: { id } })
  })

  it('returns events sorted descending by timestamp', async () => {
    const t1 = new Date('2024-01-01T10:00:00Z')
    const t2 = new Date('2024-01-01T10:00:01Z')
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 1, userId: 1, eventType: 'card_created', cardTitle: 'First',  toListName: 'Backlog', createdAt: t1 },
    })
    await prisma.activityEvent.create({
      data: { boardId: 1, cardId: 2, userId: 1, eventType: 'card_created', cardTitle: 'Second', toListName: 'Backlog', createdAt: t2 },
    })

    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)

    expect(res.status).toBe(200)
    const events = res.body as Array<{ timestamp: string; cardTitle: string }>
    expect(events).toHaveLength(2)
    expect(new Date(events[0].timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(events[1].timestamp).getTime(),
    )
    expect(events[0].cardTitle).toBe('Second')
    expect(events[1].cardTitle).toBe('First')
  })

  it('returned event includes actorName, actorId, cardTitle, eventType, and timestamp', async () => {
    await seedEvent({ fromListName: 'Backlog', toListName: 'In Progress' })

    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)

    expect(res.status).toBe(200)
    const [event] = res.body as Array<Record<string, unknown>>
    expect(event.actorName).toBe('Alice')
    expect(event.actorId).toBe(1)
    expect(event.cardTitle).toBe('User auth flow')
    expect(event.eventType).toBe('card_moved')
    expect(event).toHaveProperty('timestamp')
    expect(event).toHaveProperty('boardId')
    expect(event).toHaveProperty('cardId')
  })
})

// --- Suite 2: GET /boards/:id/activity/preview -------------------------------

describe('GET /boards/:id/activity/preview', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany()
  })

  it('returns 200 without any auth token', async () => {
    const res = await agent.get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns the same payload as the authenticated endpoint', async () => {
    await seedEvent()

    const preview = await agent.get('/boards/1/activity/preview')
    const authed  = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)

    expect(preview.status).toBe(200)
    expect(preview.body).toEqual(authed.body)
  })
})

// --- Suite 3: PATCH /cards/:id/move + activity event -------------------------

describe('PATCH /cards/:id/move + activity event', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })
  })

  it('returns 401 without auth token', async () => {
    const res = await agent
      .patch('/cards/1/move')
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('card.listId changes in DB after a successful move', async () => {
    const res = await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    const card = await prisma.card.findUniqueOrThrow({ where: { id: 1 } })
    expect(card.listId).toBe(2)
  })

  it('inserts exactly one card_moved ActivityEvent', async () => {
    await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    const events = await prisma.activityEvent.findMany()
    expect(events).toHaveLength(1)
    expect(events[0].eventType).toBe('card_moved')
  })

  it('event records correct fromListName and toListName', async () => {
    await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 3, position: 0 })

    const event = await prisma.activityEvent.findFirstOrThrow()
    expect(event.fromListName).toBe('Backlog')
    expect(event.toListName).toBe('Done')
  })

  it('feed response includes actorName and cardTitle for the move event', async () => {
    await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)

    const [event] = res.body as Array<Record<string, unknown>>
    expect(event.actorName).toBe('Alice')
    expect(event.cardTitle).toBe('User auth flow')
  })

  it('returns 400 when targetListId does not exist', async () => {
    const res = await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 9999, position: 0 })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Target list not found' })
  })
})

// --- Suite 4: Atomicity / rollback -------------------------------------------
//
// How the failure is forced:
//   vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(...)
//   patches the $transaction method on the singleton that the route handler
//   already holds a reference to. The spy makes the entire transaction reject
//   before either SQL statement executes, so neither card.update nor
//   activityEvent.create can commit — proving the two writes are always atomic.

describe('Atomicity: transaction rollback on failure', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany()
    await prisma.card.update({ where: { id: 1 }, data: { listId: 1, position: 0 } })
  })

  it('card does NOT move and NO event is created when $transaction throws', async () => {
    vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(
      new Error('forced DB failure'),
    )

    const res = await agent
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    // Global error handler must return JSON — not raw HTML.
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(JSON.stringify(res.body)).not.toMatch(/<html/i)

    // Card must NOT have moved.
    const card = await prisma.card.findUniqueOrThrow({ where: { id: 1 } })
    expect(card.listId).toBe(1)

    // No activity event must exist.
    const events = await prisma.activityEvent.findMany()
    expect(events).toHaveLength(0)
  })
})

// --- Suite 5: Security — no password leakage ---------------------------------

describe('Security: activity responses must not expose password fields', () => {
  beforeEach(async () => {
    await prisma.activityEvent.deleteMany()
    await seedEvent()
  })

  it('GET /boards/:id/activity does not contain password fields', async () => {
    const res = await agent
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)

    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toMatch(/password/i)
  })

  it('GET /boards/:id/activity/preview does not contain password fields', async () => {
    const res = await agent.get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toMatch(/password/i)
  })
})
