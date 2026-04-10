import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// Hoisted mock — must appear before route imports
vi.mock('../db', () => ({
  default: {
    boardMember:   { findUnique: vi.fn() },
    card:          { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    comment:       { findMany: vi.fn(), create: vi.fn() },
    cardLabel:     { findMany: vi.fn() },
    label:         { findUnique: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import prisma from '../db'
import activityRouter from './activity'
import cardsRouter from './cards'

// Minimal Express app — avoids importing index.ts which calls app.listen()
const app = express()
app.use(express.json())
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

const SECRET = 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, SECRET)

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RAW_EVENTS = [
  {
    id: 2, boardId: 1, actorId: 1,
    actor: { name: 'Alice' },
    eventType: 'card_moved',
    cardId: 1, card: { title: 'Fix login redirect' },
    fromList: { name: 'Backlog' }, toList: { name: 'In Progress' },
    createdAt: new Date('2026-04-10T10:00:00Z'),
  },
  {
    id: 1, boardId: 1, actorId: 2,
    actor: { name: 'Bob' },
    eventType: 'card_created',
    cardId: 1, card: { title: 'Fix login redirect' },
    fromList: null, toList: null,
    createdAt: new Date('2026-04-10T09:00:00Z'),
  },
]

// ---------------------------------------------------------------------------
// GET /boards/:id/activity
// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity', () => {
  it('rejects a request with no Authorization header with 401', async () => {
    const res = await request(app).get('/boards/1/activity')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('rejects a request with an invalid JWT token with 401', async () => {
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', 'Bearer not.a.valid.token')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('denies access to a user who is not a board member with 403', async () => {
    ;(prisma.boardMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns activity events for an authenticated board member', async () => {
    ;(prisma.boardMember.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' })
    ;(prisma.activityEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(RAW_EVENTS)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ actorName: 'Alice', eventType: 'card_moved' })
  })
})

// ---------------------------------------------------------------------------
// PATCH /cards/:id/move
// ---------------------------------------------------------------------------

describe('PATCH /cards/:id/move', () => {
  const MOCK_CARD  = { id: 1, listId: 1, list: { id: 1, boardId: 1 } }
  const MOCK_EVENT = {
    id: 1, boardId: 1, actorId: 1, eventType: 'card_moved',
    cardId: 1, fromListId: 1, toListId: 2, createdAt: new Date(),
  }

  it('updates the card and creates an ActivityEvent inside a single transaction', async () => {
    ;(prisma.card.findUnique      as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_CARD)
    ;(prisma.card.update          as ReturnType<typeof vi.fn>).mockResolvedValue({ ...MOCK_CARD, listId: 2, position: 0 })
    ;(prisma.activityEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_EVENT)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (ops: unknown[]) => Promise.all(ops)
    )

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    // Both operations were wrapped in a single $transaction call
    expect(prisma.$transaction).toHaveBeenCalledOnce()

    // card.findUnique fetches the card with its list relation (needed for boardId)
    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where:   { id: 1 },
      include: { list: true },
    })

    // card.update receives the exact target list and position
    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data:  { listId: 2, position: 0 },
    })

    // ActivityEvent captures the full move context
    expect(prisma.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          eventType:  'card_moved',
          cardId:     1,
          fromListId: 1,
          toListId:   2,
          boardId:    1,
          actorId:    1,
        },
      })
    )
  })

  it('returns 404 when the card does not exist', async () => {
    ;(prisma.card.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 500 and rolls back when the target list does not exist', async () => {
    ;(prisma.card.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_CARD)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Foreign key constraint failed on the field: `listId`')
    )

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({ error: 'Move failed' })
    expect(res.body.details).toContain('Foreign key constraint')
  })

  it('rejects unauthenticated move requests with 401', async () => {
    const res = await request(app)
      .patch('/cards/1/move')
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(401)
    expect(prisma.card.findUnique).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// GET /cards/:id
// ---------------------------------------------------------------------------

describe('GET /cards/:id', () => {
  it('returns a card with its comments and labels for an authenticated user', async () => {
    const mockCard     = { id: 3, title: 'Fix login redirect', listId: 2 }
    const mockComments = [{ id: 1, content: 'Regression from last week', cardId: 3, userId: 2 }]
    const mockLabel    = { id: 1, name: 'bug', color: '#e11d48' }

    ;(prisma.card.findUnique    as ReturnType<typeof vi.fn>).mockResolvedValue(mockCard)
    ;(prisma.comment.findMany   as ReturnType<typeof vi.fn>).mockResolvedValue(mockComments)
    ;(prisma.cardLabel.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ cardId: 3, labelId: 1 }])
    ;(prisma.label.findUnique   as ReturnType<typeof vi.fn>).mockResolvedValue(mockLabel)

    const res = await request(app)
      .get('/cards/3')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 3, title: 'Fix login redirect' })
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.labels).toEqual([mockLabel])
  })

  it('returns 404 when the card does not exist', async () => {
    ;(prisma.card.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await request(app)
      .get('/cards/999')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })
})

// ---------------------------------------------------------------------------
// POST /cards
// ---------------------------------------------------------------------------

describe('POST /cards', () => {
  it('creates a card at the next available position in the target list', async () => {
    const mockCard = { id: 6, title: 'New task', listId: 1, position: 3, description: null }
    ;(prisma.card.count  as ReturnType<typeof vi.fn>).mockResolvedValue(3)
    ;(prisma.card.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCard)

    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ title: 'New task', listId: 1 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'New task', position: 3 })
    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3, listId: 1 }) })
    )
  })
})

// ---------------------------------------------------------------------------
// POST /cards/:id/comments
// ---------------------------------------------------------------------------

describe('POST /cards/:id/comments', () => {
  it('adds a comment to a card and returns it', async () => {
    const mockComment = { id: 12, content: 'Looks good', cardId: 1, userId: 1 }
    ;(prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockComment)

    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ content: 'Looks good' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ content: 'Looks good', cardId: 1 })
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { content: 'Looks good', cardId: 1, userId: 1 },
    })
  })
})

// ---------------------------------------------------------------------------
// DELETE /cards/:id
// ---------------------------------------------------------------------------

describe('DELETE /cards/:id', () => {
  it('deletes the card and returns { ok: true } — not ok: false', async () => {
    ;(prisma.card.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const res = await request(app)
      .delete('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)   // strict boolean — kills ok:true→ok:false mutation
    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})

// ---------------------------------------------------------------------------
// GET /boards/:id/activity/preview
// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring authentication', async () => {
    ;(prisma.activityEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(RAW_EVENTS)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)

    const timestamps = res.body.map((e: { timestamp: string }) =>
      new Date(e.timestamp).getTime()
    )
    expect(timestamps[0]).toBeGreaterThan(timestamps[1])

    expect(res.body[0]).toMatchObject({
      actorName:    'Alice',
      cardTitle:    'Fix login redirect',
      fromListName: 'Backlog',
      toListName:   'In Progress',
    })
    expect(res.body[1]).toMatchObject({
      actorName:    'Bob',
      fromListName: null,
      toListName:   null,
    })
  })

  it('returns null for cardTitle and list names when an event has no associated card or lists', async () => {
    const eventWithNulls = [{
      id: 5, boardId: 1, actorId: 1,
      actor: { name: 'Alice' },
      eventType: 'card_commented',
      cardId: null, card: null,
      fromList: null, toList: null,
      createdAt: new Date('2026-04-10T11:00:00Z'),
    }]
    ;(prisma.activityEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(eventWithNulls)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({
      cardTitle:    null,  // kills OptionalChaining mutation e.card?.title
      fromListName: null,
      toListName:   null,
    })
  })
})
