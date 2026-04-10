import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../index'

// ── Mock repositories so tests never hit a real DB ────────────────────────────

vi.mock('../repositories/boardRepository', () => ({
  isBoardMember: vi.fn(),
  getBoardsForUser: vi.fn(),
  getBoardWithDetails: vi.fn(),
  createBoard: vi.fn(),
  isBoardOwner: vi.fn(),
  addBoardMember: vi.fn(),
  addBoardOwner: vi.fn(),
}))

vi.mock('../repositories/activityRepository', () => ({
  getActivityForBoard: vi.fn(),
}))

vi.mock('../repositories/cardRepository', () => ({
  getCardById: vi.fn(),
  getCardWithDetails: vi.fn(),
  createCard: vi.fn(),
  moveCard: vi.fn(),
  addComment: vi.fn(),
  deleteCard: vi.fn(),
}))

vi.mock('../db', () => ({
  default: {
    list: { findUnique: vi.fn() },
  },
}))

import * as boardRepo    from '../repositories/boardRepository'
import * as activityRepo from '../repositories/activityRepository'
import * as cardRepo     from '../repositories/cardRepository'
import prisma            from '../db'

// ── JWT helper ────────────────────────────────────────────────────────────────

import * as jwt from 'jsonwebtoken'

const SECRET = 'test-secret'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, SECRET)
}

beforeEach(() => {
  process.env.JWT_SECRET = SECRET
})

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Activity feed — GET /boards/:id/activity
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(boardRepo.isBoardMember).mockResolvedValue(false)
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(99)}`)
    expect(res.status).toBe(403)
  })

  it('returns activity events in reverse chronological order for a member', async () => {
    vi.mocked(boardRepo.isBoardMember).mockResolvedValue(true)
    const events = [
      { id: 2, eventType: 'card_moved', createdAt: new Date('2024-01-02') },
      { id: 1, eventType: 'card_moved', createdAt: new Date('2024-01-01') },
    ]
    vi.mocked(activityRepo.getActivityForBoard).mockResolvedValue(events as any)
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(200)
    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Activity preview — GET /boards/:id/activity/preview (no auth)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /boards/:id/activity/preview', () => {
  it('returns events without requiring authentication', async () => {
    const events = [{ id: 1, eventType: 'card_moved' }]
    vi.mocked(activityRepo.getActivityForBoard).mockResolvedValue(events as any)
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Card move — PATCH /cards/:id/move
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /cards/:id/move', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch('/cards/1/move')
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 when card does not exist', async () => {
    vi.mocked(cardRepo.getCardById).mockResolvedValue(null)
    const res = await request(app)
      .patch('/cards/99/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(404)
  })

  it('creates an ActivityEvent in the same transaction when move succeeds', async () => {
    vi.mocked(cardRepo.getCardById).mockResolvedValue({ id: 1, listId: 1, title: 'T' } as any)
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: 1, boardId: 10 } as any)
    vi.mocked(boardRepo.isBoardMember).mockResolvedValue(true)
    const event = { id: 5, eventType: 'card_moved', cardId: 1 }
    vi.mocked(cardRepo.moveCard).mockResolvedValue({ card: {} as any, event: event as any })

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event.eventType).toBe('card_moved')
    expect(vi.mocked(cardRepo.moveCard)).toHaveBeenCalledOnce()
  })

  it('returns 500 and rolls back when the transaction fails', async () => {
    vi.mocked(cardRepo.getCardById).mockResolvedValue({ id: 1, listId: 1, title: 'T' } as any)
    vi.mocked(prisma.list.findUnique).mockResolvedValue({ id: 1, boardId: 10 } as any)
    vi.mocked(boardRepo.isBoardMember).mockResolvedValue(true)
    vi.mocked(cardRepo.moveCard).mockRejectedValue(new Error('DB constraint'))

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
  })
})
