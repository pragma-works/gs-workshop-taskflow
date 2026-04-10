import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// Mock prisma before any route imports so all route files share the same mock
vi.mock('../db', () => ({
  default: {
    boardMember:   { findUnique: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    card:          { findUnique: vi.fn(), update: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import prisma from '../db'
import cardsRouter    from './cards'
import activityRouter from './activity'

// Build a minimal test app — avoids the app.listen() call in index.ts
const app = express()
app.use(express.json())
app.use('/boards', activityRouter)
app.use('/cards',  cardsRouter)

const SECRET = 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, SECRET)

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/boards/1/activity')

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('rejects a valid token for a non-member with 403', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(99)}`)

    expect(res.status).toBe(403)
  })

  it('returns the feed for an authenticated board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' })
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      {
        id: 1, eventType: 'card_moved', createdAt: new Date('2026-01-01T10:00:00Z'),
        actor: { name: 'Alice' }, card: { title: 'Fix login' },
        fromList: { name: 'Backlog' }, toList: { name: 'In Progress' },
      },
    ] as any)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ actorName: 'Alice', cardTitle: 'Fix login' })
  })
})

// ---------------------------------------------------------------------------

describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent in the same transaction as the card update', async () => {
    const mockEvent = {
      id: 42, eventType: 'card_moved', boardId: 1,
      actorId: 1, cardId: 3, fromListId: 1, toListId: 2,
      createdAt: new Date(),
    }

    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: 3, title: 'Dashboard widget', listId: 1,
      list: { boardId: 1, board: { id: 1 } },
    } as any)

    // $transaction resolves with [updatedCard, createdEvent]
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, mockEvent] as any)

    const res = await request(app)
      .patch('/cards/3/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, event: { eventType: 'card_moved' } })
    // Proves a single $transaction call (not two separate writes)
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring auth', async () => {
    const older = new Date('2026-01-01T08:00:00Z')
    const newer = new Date('2026-01-01T12:00:00Z')

    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      {
        id: 2, eventType: 'card_moved', createdAt: newer,
        actor: { name: 'Bob' }, card: { title: 'Profile page' },
        fromList: { name: 'Backlog' }, toList: { name: 'Done' },
      },
      {
        id: 1, eventType: 'card_moved', createdAt: older,
        actor: { name: 'Alice' }, card: { title: 'User auth' },
        fromList: null, toList: null,
      },
    ] as any)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    // Newer event comes first
    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)
    // Verifies the query itself requests descending order
    expect(vi.mocked(prisma.activityEvent.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    )
  })

  it('returns nullable fields as null when card or lists are missing', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      {
        id: 5, eventType: 'card_moved', createdAt: new Date(),
        actor: { name: 'Carol' }, card: null, fromList: null, toList: null,
      },
    ] as any)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ cardTitle: null, fromListName: null, toListName: null })
  })
})

// ---------------------------------------------------------------------------

describe('PATCH /cards/:id/move — error handling', () => {
  it('returns 500 and rolls back cleanly when the target list does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: 1, title: 'Test card', listId: 1,
      list: { boardId: 1, board: { id: 1 } },
    } as any)

    // Simulate FK constraint failure — both writes roll back
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error('Foreign key constraint failed on the field: `listId`'),
    )

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      error: 'Move failed',
      details: expect.stringContaining('Foreign key constraint'),
    })
  })
})
