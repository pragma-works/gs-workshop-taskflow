import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// ── Mock the Prisma singleton before any route module is imported ──────────────
vi.mock('../db', () => ({
  default: {
    card: {
      findUnique: vi.fn(),
      update:     vi.fn(),
      count:      vi.fn(),
      create:     vi.fn(),
      delete:     vi.fn(),
    },
    activityEvent: {
      create:   vi.fn(),
      findMany: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      create:     vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Imports come after vi.mock so they receive the mocked module
import prisma from '../db'
import cardsRouter    from './cards'
import activityRouter from './activity'

// ── Minimal Express app (no app.listen side-effect) ───────────────────────────
const app = express()
app.use(express.json())
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

// ── Helpers ───────────────────────────────────────────────────────────────────
const JWT_SECRET = 'super-secret-key-change-me'
const makeToken  = (userId: number) => jwt.sign({ userId }, JWT_SECRET)

/** Minimal card row + list join that satisfies the move handler */
const mockCard = {
  id:          10,
  title:       'Task A',
  description: null,
  position:    0,
  dueDate:     null,
  listId:      1,
  assigneeId:  null,
  createdAt:   new Date().toISOString(),
  list:        { boardId: 5 },
}

const mockEvent = {
  id:         1,
  boardId:    5,
  actorId:    42,
  eventType:  'card_moved',
  cardId:     10,
  fromListId: 1,
  toListId:   2,
  createdAt:  new Date().toISOString(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Activity feed', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Case 1 ────────────────────────────────────────────────────────────────
  it('rejects an unauthenticated request to GET /boards/:id/activity with 401', async () => {
    const res = await request(app).get('/boards/1/activity')

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  // ── Case 2 ────────────────────────────────────────────────────────────────
  it('creates an ActivityEvent in the same transaction when a card is moved', async () => {
    ;(prisma.card.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCard)
    // $transaction receives the two PrismaPromise arguments and returns their results
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([mockCard, mockEvent])

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', `Bearer ${makeToken(42)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, event: expect.objectContaining({ eventType: 'card_moved' }) })

    // Both operations were built and passed to a single $transaction call
    expect(prisma.$transaction).toHaveBeenCalledOnce()

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data:  expect.objectContaining({ listId: 2, position: 0 }),
      }),
    )

    expect(prisma.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType:  'card_moved',
          cardId:     10,
          fromListId: 1,
          toListId:   2,
          actorId:    42,
          boardId:    5,
        }),
      }),
    )
  })

  // ── Case 3 ────────────────────────────────────────────────────────────────
  it('returns events newest-first with flattened relation names on the preview endpoint', async () => {
    const earlier = '2024-01-01T10:00:00.000Z'
    const later   = '2024-01-01T11:00:00.000Z'

    // findMany is expected to return data already ordered desc (as the query requests)
    const rawEvents = [
      {
        id:         2,
        boardId:    1,
        actorId:    1,
        eventType:  'card_moved',
        cardId:     5,
        fromListId: 1,
        toListId:   2,
        createdAt:  later,
        actor:     { name: 'Alice' },
        card:      { title: 'Sprint task' },
        fromList:  { name: 'Backlog' },
        toList:    { name: 'In Progress' },
      },
      {
        id:         1,
        boardId:    1,
        actorId:    1,
        eventType:  'card_moved',
        cardId:     5,
        fromListId: null,
        toListId:   1,
        createdAt:  earlier,
        actor:     { name: 'Alice' },
        card:      { title: 'Sprint task' },
        fromList:  null,
        toList:    { name: 'Backlog' },
      },
    ]
    ;(prisma.activityEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rawEvents)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)

    // Verify the query was issued with reverse-chronological ordering
    expect(prisma.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:    { boardId: 1 },
        orderBy:  { createdAt: 'desc' },
      }),
    )

    // Newest event is first
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)

    // Relation objects are flattened into scalar fields
    expect(res.body[0].actorName).toBe('Alice')
    expect(res.body[0].cardTitle).toBe('Sprint task')
    expect(res.body[0].fromListName).toBe('Backlog')
    expect(res.body[0].toListName).toBe('In Progress')

    // Nullable relations become null, not undefined
    expect(res.body[1].fromListName).toBeNull()

    // Raw relation objects must not leak into the response
    expect(res.body[0]).not.toHaveProperty('actor')
    expect(res.body[0]).not.toHaveProperty('card')
    expect(res.body[0]).not.toHaveProperty('fromList')
    expect(res.body[0]).not.toHaveProperty('toList')
  })

  // ── Case 4 ────────────────────────────────────────────────────────────────
  it('returns 500 and leaves the card unchanged when the target list does not exist', async () => {
    ;(prisma.card.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCard)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Foreign key constraint failed on the field: `listId`'),
    )

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', `Bearer ${makeToken(42)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(res.body.details).toContain('Foreign key constraint')

    // The atomic transaction was attempted exactly once
    expect(prisma.$transaction).toHaveBeenCalledOnce()

    // No independent card.update ran outside the transaction
    // (the only card.update call is the one built as an argument to $transaction)
    const updateCalls = (prisma.card.update as ReturnType<typeof vi.fn>).mock.calls
    expect(updateCalls).toHaveLength(1)
    // But $transaction rejected, so the DB was never mutated
    // Verify the response body contains no stale card data
    expect(res.body).not.toHaveProperty('ok')
  })
})
