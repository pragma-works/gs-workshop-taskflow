import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../../src/db', () => ({
  default: {
    boardMember: {
      findUnique: vi.fn(),
    },
    activityEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    list: { findMany: vi.fn() },
    board: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '../../src/db'
import app from '../../src/index'

const mockPrisma = prisma as unknown as {
  boardMember: { findUnique: ReturnType<typeof vi.fn> }
  activityEvent: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  card: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const SECRET = 'test-secret'
const BOARD_ID = 10
const CARD_ID = 5
const USER_ID = 2

function makeToken(userId = USER_ID): string {
  return jwt.sign({ userId }, SECRET)
}

const sampleEvent = {
  id: 1,
  boardId: BOARD_ID,
  cardId: CARD_ID,
  userId: USER_ID,
  type: 'card_moved',
  payload: '{"fromListId":1,"toListId":2,"position":0}',
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /boards/:id/activity ────────────────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get(`/boards/${BOARD_ID}/activity`)
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('Authorization', 'Bearer bad.token.here')
    expect(res.status).toBe(401)
  })

  it('returns 403 when the user is not a board member', async () => {
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce(null)

    const res = await request(app)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 200 with activity events for a board member', async () => {
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ userId: USER_ID, boardId: BOARD_ID, role: 'member' })
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([sampleEvent])

    const res = await request(app)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ type: 'card_moved', boardId: BOARD_ID })
  })

  it('returns 200 with empty array when no events exist', async () => {
    mockPrisma.boardMember.findUnique.mockResolvedValueOnce({ userId: USER_ID, boardId: BOARD_ID })
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([])

    const res = await request(app)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('Authorization', `Bearer ${makeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─── GET /boards/:id/activity/preview ────────────────────────────────────────

describe('GET /boards/:id/activity/preview', () => {
  it('returns 200 without requiring authentication', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([sampleEvent])

    const res = await request(app).get(`/boards/${BOARD_ID}/activity/preview`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns an empty array when no events exist', async () => {
    mockPrisma.activityEvent.findMany.mockResolvedValueOnce([])

    const res = await request(app).get(`/boards/${BOARD_ID}/activity/preview`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

// ─── POST /cards/:id/move ─────────────────────────────────────────────────────

describe('POST /cards/:id/move', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post(`/cards/${CARD_ID}/move`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist', async () => {
    mockPrisma.card.findUnique.mockResolvedValueOnce(null)

    const res = await request(app)
      .post(`/cards/${CARD_ID}/move`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(404)
  })

  it('returns 200 and the new activity event on success', async () => {
    mockPrisma.card.findUnique.mockResolvedValueOnce({
      id: CARD_ID,
      listId: 1,
      list: { boardId: BOARD_ID },
    })
    mockPrisma.$transaction.mockResolvedValueOnce([
      { id: CARD_ID, listId: 2, position: 0 },
      sampleEvent,
    ])

    const res = await request(app)
      .post(`/cards/${CARD_ID}/move`)
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(res.body.event).toMatchObject({ type: 'card_moved' })
  })
})
