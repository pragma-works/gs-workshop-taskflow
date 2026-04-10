import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

// Must be hoisted before any import that touches the DB
vi.mock('../db', () => ({
  default: {
    boardMember:   { findUnique: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    card:          { findUnique: vi.fn(), update: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import app from '../index'
import prisma from '../db'

// ── helpers ────────────────────────────────────────────────────────────────

const SECRET = 'super-secret-key-change-me'
const bearerToken = (userId: number) =>
  `Bearer ${jwt.sign({ userId }, SECRET)}`

// Cast to `any` so we can call .mockResolvedValue / .mockRejectedValue
// without fighting Prisma's deeply-typed overloads.
const db = prisma as any

const makeEvent = (id: number, createdAt: Date) => ({
  id,
  boardId:    1,
  actorId:    1,
  eventType:  'card_moved',
  cardId:     10,
  fromListId: 2,
  toListId:   3,
  createdAt,
  actor:    { name: 'Alice' },
  card:     { title: 'Fix bug' },
  fromList: { name: 'In Progress' },
  toList:   { name: 'Done' },
})

const makeCard = () => ({
  id:        10,
  title:     'Fix bug',
  listId:    2,
  position:  0,
  list:      { boardId: 1 },
})

beforeEach(() => vi.clearAllMocks())

// ── 1. Unauthenticated request to GET /boards/:id/activity returns 401 ─────

describe('GET /boards/:id/activity', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when the caller is not a board member', async () => {
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', bearerToken(99))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns shaped activity events to board members', async () => {
    db.boardMember.findUnique.mockResolvedValue({ userId: 1, boardId: 1, role: 'member' })
    db.activityEvent.findMany.mockResolvedValue([makeEvent(1, new Date())])
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({
      actorName:    'Alice',
      cardTitle:    'Fix bug',
      fromListName: 'In Progress',
      toListName:   'Done',
    })
  })
})

// ── 2. PATCH /cards/:id/move creates an ActivityEvent in the same transaction

describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent inside the same transaction as the card update', async () => {
    const card = makeCard()
    const mockEvent = { id: 5, eventType: 'card_moved', cardId: 10 }

    db.card.findUnique.mockResolvedValue(card)
    db.card.update.mockResolvedValue({ ...card, listId: 3 })
    db.activityEvent.create.mockResolvedValue(mockEvent)
    // Simulate Prisma resolving each operation in the batch
    db.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 3, position: 1 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, event: mockEvent })

    // Both writes must have been submitted to the transaction
    expect(db.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { listId: 3, position: 1 } })
    )
    expect(db.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType:  'card_moved',
          cardId:     10,
          fromListId: 2,
          toListId:   3,
          actorId:    1,
          boardId:    1,
        }),
      })
    )
    // Everything went through $transaction (not issued as loose writes)
    expect(db.$transaction).toHaveBeenCalledOnce()
  })
})

// ── 3. GET /boards/:id/activity/preview returns events in reverse chronological order

describe('GET /boards/:id/activity/preview', () => {
  it('returns events newest-first without requiring authentication', async () => {
    const newer = makeEvent(2, new Date('2026-04-10T12:00:00Z'))
    const older = makeEvent(1, new Date('2026-04-09T08:00:00Z'))
    // Prisma returns them pre-sorted (orderBy createdAt desc); mock honours that
    db.activityEvent.findMany.mockResolvedValue([newer, older])

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2)   // newer first
    expect(res.body[1].id).toBe(1)   // older second

    // Verify the query was issued with the correct ordering
    expect(db.activityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } })
    )
  })
})

// ── 4. Moving a card to a non-existent list rolls back cleanly ──────────────

describe('PATCH /cards/:id/move — database failure', () => {
  it('returns 500 with error details and rolls back when the transaction fails', async () => {
    db.card.findUnique.mockResolvedValue(makeCard())
    db.card.update.mockResolvedValue({})
    db.activityEvent.create.mockResolvedValue({})
    // Simulate a FK constraint violation (non-existent targetListId)
    db.$transaction.mockRejectedValue(
      new Error('Foreign key constraint failed on the field: `listId`')
    )

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(res.body.details).toContain('Foreign key constraint')
  })

  it('returns 404 when the card does not exist', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .patch('/cards/9999/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 3, position: 0 })
    expect(res.status).toBe(404)
    expect(db.$transaction).not.toHaveBeenCalled()
  })
})
