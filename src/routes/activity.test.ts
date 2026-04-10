import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../repositories/activity.repo', () => ({
  getActivityByBoard: vi.fn(),
  createActivityEvent: vi.fn(),
}))

vi.mock('../repositories/boards.repo', () => ({
  isBoardMember: vi.fn(),
  findBoardsByUser: vi.fn(),
  findBoardWithLists: vi.fn(),
  createBoard: vi.fn(),
  addBoardMember: vi.fn(),
}))

vi.mock('../repositories/cards.repo', () => ({
  findCardWithDetails: vi.fn(),
  createCard: vi.fn(),
  moveCardWithActivity: vi.fn(),
  addComment: vi.fn(),
  deleteCard: vi.fn(),
}))

vi.mock('../repositories/users.repo', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}))

import app from '../index'
import { getActivityByBoard } from '../repositories/activity.repo'
import { isBoardMember } from '../repositories/boards.repo'
import { moveCardWithActivity } from '../repositories/cards.repo'

const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET)

describe('Activity Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when requesting GET /boards/:id/activity without authentication', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
  })

  it('PATCH /cards/:id/move creates an ActivityEvent atomically in the same transaction', async () => {
    const mockEvent = {
      id: 1, eventType: 'card_moved', boardId: 1, actorId: 1,
      cardId: 2, fromListId: 10, toListId: 20, createdAt: new Date(),
    }
    vi.mocked(moveCardWithActivity).mockResolvedValue({
      card: {
        id: 2, listId: 20, position: 0, title: 'Test',
        description: null, dueDate: null, assigneeId: null, createdAt: new Date(),
      },
      event: mockEvent,
    })

    const res = await request(app)
      .patch('/cards/2/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 20, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toBeDefined()
    expect(res.body.event.eventType).toBe('card_moved')
    expect(moveCardWithActivity).toHaveBeenCalledWith(2, 20, 0, 1)
  })

  it('GET /boards/:id/activity/preview returns events in reverse chronological order without requiring auth', async () => {
    const now = new Date('2025-01-02T10:00:00Z')
    const earlier = new Date('2025-01-01T10:00:00Z')
    const events = [
      {
        id: 2, eventType: 'card_moved', boardId: 1, actorId: 1, cardId: 1,
        fromListId: 1, toListId: 2, createdAt: now,
        actor: { name: 'Alice' }, card: { title: 'Card A' },
        fromList: { name: 'Todo' }, toList: { name: 'Done' },
      },
      {
        id: 1, eventType: 'card_moved', boardId: 1, actorId: 1, cardId: 1,
        fromListId: 0, toListId: 1, createdAt: earlier,
        actor: { name: 'Alice' }, card: { title: 'Card A' },
        fromList: { name: 'Backlog' }, toList: { name: 'Todo' },
      },
    ]
    vi.mocked(getActivityByBoard).mockResolvedValue(events as any)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)
    expect(res.body[0].actorName).toBe('Alice')
    expect(res.body[0].fromListName).toBe('Todo')
    expect(res.body[0].toListName).toBe('Done')
  })

  it('returns 404 when moving a card to a non-existent list (transaction rolls back cleanly)', async () => {
    vi.mocked(moveCardWithActivity).mockResolvedValue(null)

    const res = await request(app)
      .patch('/cards/99/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})
