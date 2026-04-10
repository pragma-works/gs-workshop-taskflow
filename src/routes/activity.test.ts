import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

// ---------------------------------------------------------------------------
// Mock the db module so tests never touch a real database
// ---------------------------------------------------------------------------
vi.mock('../db', () => {
  const boardMember = { findUnique: vi.fn() }
  const activityEvent = { findMany: vi.fn(), create: vi.fn() }
  const card = { findUnique: vi.fn(), update: vi.fn() }
  const list = { findUnique: vi.fn() }

  const $transaction = vi.fn(async (ops: unknown[]) => {
    // Execute each prisma call in order and return results
    const results = await Promise.all(ops)
    return results
  })

  return {
    default: { boardMember, activityEvent, card, list, $transaction },
  }
})

// Import app AFTER mocks are set up
import app from '../index'
import prisma from '../db'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, SECRET)
}

const AUTH_TOKEN = makeToken(1)

function authHeader() {
  return { Authorization: `Bearer ${AUTH_TOKEN}` }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/boards/1/activity')
      .set(authHeader())

    expect(res.status).toBe(403)
  })

  it('returns activity events in reverse chronological order for authenticated board members', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' } as never)

    const now = new Date()
    const earlier = new Date(now.getTime() - 60_000)

    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      {
        id: 2,
        boardId: 1,
        actorId: 1,
        eventType: 'card_moved',
        cardId: 10,
        fromListId: 1,
        toListId: 2,
        createdAt: now,
        actor: { name: 'Alice' },
        card: { title: 'Fix bug' },
        fromList: { name: 'Backlog' },
        toList: { name: 'In Progress' },
      },
      {
        id: 1,
        boardId: 1,
        actorId: 1,
        eventType: 'card_moved',
        cardId: 10,
        fromListId: 2,
        toListId: 1,
        createdAt: earlier,
        actor: { name: 'Alice' },
        card: { title: 'Fix bug' },
        fromList: { name: 'In Progress' },
        toList: { name: 'Backlog' },
      },
    ] as never)

    const res = await request(app)
      .get('/boards/1/activity')
      .set(authHeader())

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2) // newer event first
    expect(res.body[0].actorName).toBe('Alice')
    expect(res.body[0].cardTitle).toBe('Fix bug')
    expect(res.body[0].fromListName).toBe('Backlog')
    expect(res.body[0].toListName).toBe('In Progress')
  })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without requiring authentication', async () => {
    const now = new Date()
    const earlier = new Date(now.getTime() - 60_000)

    vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
      {
        id: 5,
        boardId: 2,
        actorId: 2,
        eventType: 'card_moved',
        cardId: 20,
        fromListId: 3,
        toListId: 4,
        createdAt: now,
        actor: { name: 'Bob' },
        card: { title: 'New feature' },
        fromList: { name: 'Todo' },
        toList: { name: 'Done' },
      },
      {
        id: 3,
        boardId: 2,
        actorId: 2,
        eventType: 'card_moved',
        cardId: 20,
        fromListId: 4,
        toListId: 3,
        createdAt: earlier,
        actor: { name: 'Bob' },
        card: { title: 'New feature' },
        fromList: { name: 'Done' },
        toList: { name: 'Todo' },
      },
    ] as never)

    const res = await request(app).get('/boards/2/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(5) // newer first
    expect(res.body[1].id).toBe(3)
  })
})

describe('PATCH /cards/:id/move', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an ActivityEvent in the same transaction when a card is moved', async () => {
    const fakeCard = {
      id: 10,
      listId: 1,
      list: { id: 1, boardId: 5, name: 'Backlog', position: 0 },
    }
    const fakeEvent = {
      id: 99,
      boardId: 5,
      actorId: 1,
      eventType: 'card_moved',
      cardId: 10,
      fromListId: 1,
      toListId: 2,
      createdAt: new Date(),
    }
    const fakeTargetList = { id: 2, name: 'In Progress', boardId: 5, position: 1 }

    vi.mocked(prisma.card.findUnique).mockResolvedValue(fakeCard as never)
    vi.mocked(prisma.list.findUnique).mockResolvedValue(fakeTargetList as never)

    // $transaction receives array of promises; return [updatedCard, event]
    vi.mocked(prisma.$transaction).mockImplementation(async () => {
      return [{ ...fakeCard, listId: 2 }, fakeEvent]
    })

    const res = await request(app)
      .patch('/cards/10/move')
      .set(authHeader())
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toMatchObject({ eventType: 'card_moved', cardId: 10 })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when the target list does not exist and rolls back cleanly', async () => {
    const fakeCard = {
      id: 11,
      listId: 1,
      list: { id: 1, boardId: 5, name: 'Backlog', position: 0 },
    }

    vi.mocked(prisma.card.findUnique).mockResolvedValue(fakeCard as never)
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .patch('/cards/11/move')
      .set(authHeader())
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
    // Transaction must NOT have been called — card state is unchanged
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
