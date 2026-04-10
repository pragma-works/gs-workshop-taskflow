import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

// Mock prisma before importing anything that depends on it
vi.mock('../db', () => ({
  default: {
    boardMember:   { findUnique: vi.fn() },
    card:          { findUnique: vi.fn(), update: vi.fn() },
    activityEvent: { findMany: vi.fn(), create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import app from '../index'
import prisma from '../db'

const SECRET = 'super-secret-key-change-me'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, SECRET)
}

// Shared fixture builders
const mockCard = (overrides = {}) => ({
  id: 1,
  title: 'Fix bug',
  listId: 10,
  position: 0,
  description: null,
  dueDate: null,
  assigneeId: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  list: { boardId: 99 },
  ...overrides,
})

const mockEvent = (createdAt: string, overrides = {}) => ({
  id: 1,
  eventType: 'card_moved',
  createdAt: new Date(createdAt),
  boardId: 99,
  cardId: 1,
  actor:    { name: 'Alice' },
  card:     { title: 'Fix bug' },
  fromList: { name: 'To Do' },
  toList:   { name: 'In Progress' },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /boards/:id/activity — authenticated
// ---------------------------------------------------------------------------
describe('GET /boards/:id/activity', () => {
  it('returns 401 when no authentication token is provided', async () => {
    const res = await request(app).get('/boards/99/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when the caller is not a member of the board', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/boards/99/activity')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns the activity feed for a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValueOnce(
      { userId: 7, boardId: 99, role: 'member' } as any,
    )
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce([
      mockEvent('2024-01-02T12:00:00Z') as any,
    ])

    const res = await request(app)
      .get('/boards/99/activity')
      .set('Authorization', `Bearer ${makeToken(7)}`)

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({
      actorName:    'Alice',
      cardTitle:    'Fix bug',
      fromListName: 'To Do',
      toListName:   'In Progress',
    })
  })
})

// ---------------------------------------------------------------------------
// PATCH /cards/:id/move
// ---------------------------------------------------------------------------
describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent atomically when a card is moved successfully', async () => {
    const card = mockCard()
    const event = mockEvent('2024-01-02T12:00:00Z', { fromListId: 10, toListId: 20 })

    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(card as any)
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([
      { ...card, listId: 20, position: 1 },
      event,
    ] as any)

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ targetListId: 20, position: 1 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(res.body.event).toBeDefined()
    // Transaction must have been called exactly once (atomic)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('rolls back cleanly and returns 500 when the move transaction fails', async () => {
    const card = mockCard()
    vi.mocked(prisma.card.findUnique).mockResolvedValueOnce(card as any)
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(
      new Error('Foreign key constraint failed on field: toListId'),
    )

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(typeof res.body.details).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// GET /boards/:id/activity/preview — no auth required
// ---------------------------------------------------------------------------
describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring authentication', async () => {
    const events = [
      mockEvent('2024-01-03T09:00:00Z', { id: 3 }),
      mockEvent('2024-01-02T08:00:00Z', { id: 2 }),
      mockEvent('2024-01-01T07:00:00Z', { id: 1 }),
    ]
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce(events as any)

    const res = await request(app).get('/boards/99/activity/preview')

    expect(res.status).toBe(200)
    // Verify no auth header was needed (no 401)
    const ids = res.body.map((e: any) => e.id)
    expect(ids).toEqual([3, 2, 1])
    // Timestamps should be descending
    const timestamps = res.body.map((e: any) => new Date(e.createdAt).getTime())
    expect(timestamps[0]).toBeGreaterThan(timestamps[1])
    expect(timestamps[1]).toBeGreaterThan(timestamps[2])
  })

  it('returns null for optional fields when card or lists are not associated', async () => {
    vi.mocked(prisma.activityEvent.findMany).mockResolvedValueOnce([
      {
        ...mockEvent('2024-01-01T00:00:00Z'),
        cardId:   null,
        card:     null,
        fromList: null,
        toList:   null,
      } as any,
    ])

    const res = await request(app).get('/boards/99/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({
      cardTitle:    null,
      fromListName: null,
      toListName:   null,
    })
  })
})
