import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import { JWT_SECRET } from './middleware/auth'

// Mock Prisma so tests never touch the real database
vi.mock('./db', () => {
  const prisma = {
    boardMember: {
      findUnique: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { default: prisma }
})

// Import app AFTER mocks are set up
const { default: app } = await import('./index')
const { default: prisma } = await import('./db')

function makeToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Test 1 ──────────────────────────────────────────────────────────────────
describe('GET /boards/:id/activity', () => {
  it('returns 401 when no authentication token is provided', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when the caller is not a board member', async () => {
    ;(prisma.boardMember.findUnique as any).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(99)}`)

    expect(res.status).toBe(403)
  })

  it('returns activity events for a board member', async () => {
    ;(prisma.boardMember.findUnique as any).mockResolvedValue({ userId: 1, boardId: 1 })
    ;(prisma.activityEvent.findMany as any).mockResolvedValue([
      {
        id: 1,
        boardId: 1,
        actorId: 1,
        eventType: 'card_moved',
        cardId: 3,
        fromListId: 1,
        toListId: 2,
        createdAt: new Date('2026-04-07T10:00:00.000Z'),
        actor: { id: 1, name: 'Alice' },
        card: { id: 3, title: 'Fix login redirect' },
        fromList: { id: 1, name: 'Backlog' },
        toList: { id: 2, name: 'In Progress' },
      },
    ])

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({
      actorName: 'Alice',
      cardTitle: 'Fix login redirect',
    })
  })
})

// ─── Test 2 ──────────────────────────────────────────────────────────────────
describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent atomically in the same transaction as the card update', async () => {
    const mockEvent = {
      id: 1,
      boardId: 1,
      actorId: 1,
      eventType: 'card_moved',
      cardId: 1,
      fromListId: 1,
      toListId: 2,
      createdAt: new Date(),
    }

    ;(prisma.card.findUnique as any).mockResolvedValue({ id: 1, listId: 1 })
    ;(prisma.list.findUnique as any).mockResolvedValue({ id: 2, boardId: 1 })
    ;(prisma.$transaction as any).mockResolvedValue([
      { id: 1, listId: 2, position: 0 },
      mockEvent,
    ])

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(res.body.event).toMatchObject({ eventType: 'card_moved' })

    // Confirm $transaction was called (not two separate writes)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })
})

// ─── Test 3 ──────────────────────────────────────────────────────────────────
describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring authentication', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 60_000)

    ;(prisma.activityEvent.findMany as any).mockResolvedValue([
      {
        id: 2,
        boardId: 1,
        actorId: 2,
        eventType: 'card_moved',
        cardId: 1,
        fromListId: 1,
        toListId: 2,
        createdAt: now,
        actor: { id: 2, name: 'Bob' },
        card: { id: 1, title: 'User auth flow' },
        fromList: { id: 1, name: 'Backlog' },
        toList: { id: 2, name: 'In Progress' },
      },
      {
        id: 1,
        boardId: 1,
        actorId: 1,
        eventType: 'card_created',
        cardId: 1,
        fromListId: null,
        toListId: null,
        createdAt: earlier,
        actor: { id: 1, name: 'Alice' },
        card: { id: 1, title: 'User auth flow' },
        fromList: null,
        toList: null,
      },
    ])

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    // Most recent first
    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)
    // No auth required
    expect(res.status).not.toBe(401)
  })
})

// ─── Test 4 ──────────────────────────────────────────────────────────────────
describe('PATCH /cards/:id/move to a non-existent list', () => {
  it('returns 404 and does not write anything to the database', async () => {
    ;(prisma.card.findUnique as any).mockResolvedValue({ id: 1, listId: 1 })
    ;(prisma.list.findUnique as any).mockResolvedValue(null) // list not found

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(404)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
