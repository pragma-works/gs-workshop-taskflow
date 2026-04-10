import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// Must be declared before route imports so Vitest hoisting replaces the module
vi.mock('../db', () => ({
  default: {
    boardMember:   { findUnique: vi.fn() },
    card:          { findUnique: vi.fn(), update: vi.fn() },
    activityEvent: { create: vi.fn(), findMany: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

// Route imports come after the mock declaration
import prisma from '../db'
import activityRouter from './activity'
import cardsRouter from './cards'

// ── helpers ──────────────────────────────────────────────────────────────────

const TOKEN_SECRET = 'super-secret-key-change-me'
const ACTOR_ID     = 42
const AUTH_HEADER  = `Bearer ${jwt.sign({ userId: ACTOR_ID }, TOKEN_SECRET)}`

/** Minimal app that covers both routers under test; avoids importing index.ts
 *  (which calls app.listen and starts a real server). */
const app = express()
app.use(express.json())
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

/** Builds a realistic ActivityEvent row as Prisma would return it with includes. */
function makeEvent(overrides: Partial<{
  id: number
  boardId: number
  cardId: number
  fromListId: number
  toListId: number
  createdAt: Date
  actorName: string
  cardTitle: string
  fromListName: string
  toListName: string
}> = {}) {
  const o = { id: 1, boardId: 1, cardId: 10, fromListId: 1, toListId: 2,
               createdAt: new Date('2024-06-01T12:00:00Z'),
               actorName: 'Alice', cardTitle: 'Task A',
               fromListName: 'Backlog', toListName: 'In Progress', ...overrides }
  return {
    id:         o.id,
    boardId:    o.boardId,
    actorId:    ACTOR_ID,
    eventType:  'card_moved',
    cardId:     o.cardId,
    fromListId: o.fromListId,
    toListId:   o.toListId,
    createdAt:  o.createdAt,
    actor:    { name: o.actorName },
    card:     { title: o.cardTitle },
    fromList: { name: o.fromListName },
    toList:   { name: o.toListName },
  }
}

/** Card row as returned by findUnique with include: { list: true }. */
const MOCK_CARD = {
  id: 7, title: 'My Card', description: null,
  position: 0, dueDate: null, listId: 1, assigneeId: null,
  createdAt: new Date(),
  list: { id: 1, boardId: 5, name: 'Backlog', position: 0 },
}

beforeEach(() => vi.clearAllMocks())

// ── 1. Authentication guard ───────────────────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app).get('/boards/1/activity')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
    expect(prisma.boardMember.findUnique).not.toHaveBeenCalled()
  })

  it('returns 403 when the caller is authenticated but not a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 200 with events when the caller is a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(
      { userId: ACTOR_ID, boardId: 1, role: 'member' }
    )
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue(
      [makeEvent()] as any
    )

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

// ── 2. PATCH /cards/:id/move — transactional ActivityEvent creation ───────────

describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent inside the same transaction as the card update', async () => {
    const updatedCard  = { ...MOCK_CARD, listId: 2, position: 0 }
    const createdEvent = makeEvent({ fromListId: 1, toListId: 2 })

    vi.mocked(prisma.card.findUnique).mockResolvedValue(MOCK_CARD as any)
    vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any)
    vi.mocked(prisma.activityEvent.create).mockResolvedValue(createdEvent as any)
    // Resolve each PrismaPromise in the array so the handler can destructure the result
    vi.mocked(prisma.$transaction).mockImplementation(
      (ops: unknown) => Promise.all(ops as Promise<unknown>[]) as any
    )

    const res = await request(app)
      .patch('/cards/7/move')
      .set('Authorization', AUTH_HEADER)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })

    // Both writes must have been batched into a single $transaction call
    expect(prisma.$transaction).toHaveBeenCalledOnce()

    // card.update called with correct destination
    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data:  expect.objectContaining({ listId: 2, position: 0 }),
      })
    )

    // activityEvent.create carries all required fields
    expect(prisma.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType:  'card_moved',
          boardId:    5,          // derived from card.list.boardId
          actorId:    ACTOR_ID,
          cardId:     7,
          fromListId: 1,
          toListId:   2,
        }),
      })
    )

    // Response carries the created event
    expect(res.body.event).toMatchObject({
      eventType:  'card_moved',
      fromListId: 1,
      toListId:   2,
    })
  })
})

// ── 3. Preview endpoint — ordering ───────────────────────────────────────────

describe('GET /boards/:id/activity/preview', () => {
  it('requires no authentication', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([])

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(prisma.boardMember.findUnique).not.toHaveBeenCalled()
  })

  it('returns events in reverse chronological order', async () => {
    const older = makeEvent({
      id: 1, createdAt: new Date('2024-01-01T08:00:00Z'),
      cardTitle: 'Older Task',
    })
    const newer = makeEvent({
      id: 2, createdAt: new Date('2024-01-02T08:00:00Z'),
      cardTitle: 'Newer Task',
    })

    // Mock returns newest-first, matching the orderBy: { createdAt: 'desc' } query
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([newer, older] as any)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)

    const [first, second] = res.body as Array<{ createdAt: string; cardTitle: string }>
    expect(new Date(first.createdAt).getTime())
      .toBeGreaterThan(new Date(second.createdAt).getTime())
    expect(first.cardTitle).toBe('Newer Task')
    expect(second.cardTitle).toBe('Older Task')
  })

  it('queries the database with orderBy createdAt desc and the correct boardId', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([])

    await request(app).get('/boards/99/activity/preview')

    expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   { boardId: 99 },
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('flattens relation names into the response shape', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue(
      [makeEvent({
        actorName: 'Bob', cardTitle: 'Fix bug',
        fromListName: 'Todo', toListName: 'Done',
      })] as any
    )

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.body[0]).toMatchObject({
      actorName:    'Bob',
      cardTitle:    'Fix bug',
      fromListName: 'Todo',
      toListName:   'Done',
    })
    // Nested relation objects must not bleed into the response
    expect(res.body[0].actor).toBeUndefined()
    expect(res.body[0].fromList).toBeUndefined()
  })
})

// ── 4. Non-existent target list rolls back cleanly ───────────────────────────

describe('PATCH /cards/:id/move to a non-existent list', () => {
  it('returns 500 with Move failed and rolls back when the target list does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(MOCK_CARD as any)
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error('Foreign key constraint failed on field: `listId`')
    )

    const res = await request(app)
      .patch('/cards/7/move')
      .set('Authorization', AUTH_HEADER)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      error:   'Move failed',
      details: expect.stringContaining('Foreign key'),
    })

    // The transaction was attempted exactly once — no retry or partial commit
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('returns 404 when the card itself does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .patch('/cards/9999/move')
      .set('Authorization', AUTH_HEADER)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(404)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
