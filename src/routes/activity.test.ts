import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../db', () => ({ default: {} }))

vi.mock('../middleware/auth', () => ({
  verifyToken: vi.fn(),
  signToken: vi.fn(),
}))

vi.mock('../repositories/userRepo', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}))

vi.mock('../repositories/boardRepo', () => ({
  findBoardsByUser: vi.fn(),
  findBoardById: vi.fn(),
  findBoardWithDetails: vi.fn(),
  findMembership: vi.fn(),
  createBoard: vi.fn(),
  addBoardMember: vi.fn(),
}))

vi.mock('../repositories/cardRepo', () => ({
  findCardById: vi.fn(),
  findCardWithDetails: vi.fn(),
  createCard: vi.fn(),
  findListById: vi.fn(),
  moveCardWithActivity: vi.fn(),
  deleteCard: vi.fn(),
  createComment: vi.fn(),
}))

vi.mock('../repositories/activityRepo', () => ({
  findActivityByBoard: vi.fn(),
}))

import app from '../index'
import { verifyToken } from '../middleware/auth'
import { findCardById, findListById, moveCardWithActivity } from '../repositories/cardRepo'
import { findActivityByBoard } from '../repositories/activityRepo'
import { findMembership } from '../repositories/boardRepo'

describe('Activity Feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /boards/:id/activity', () => {
    it('returns 401 for unauthenticated requests', async () => {
      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error('No auth header')
      })

      const res = await request(app).get('/boards/1/activity')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('returns activity events for authenticated board members', async () => {
      vi.mocked(verifyToken).mockReturnValue(1)
      vi.mocked(findMembership).mockResolvedValue({
        userId: 1,
        boardId: 1,
        role: 'member',
      } as any)
      vi.mocked(findActivityByBoard).mockResolvedValue([
        {
          id: 1,
          boardId: 1,
          actorId: 1,
          eventType: 'card_moved',
          cardId: 1,
          fromListId: 1,
          toListId: 2,
          createdAt: new Date('2026-04-10T10:00:00Z'),
          actorName: 'Alice',
          cardTitle: 'Test card',
          fromListName: 'Backlog',
          toListName: 'In Progress',
        },
      ])

      const res = await request(app).get('/boards/1/activity')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].actorName).toBe('Alice')
      expect(res.body[0].eventType).toBe('card_moved')
    })
  })

  describe('PATCH /cards/:id/move', () => {
    it('creates an ActivityEvent in the same transaction', async () => {
      vi.mocked(verifyToken).mockReturnValue(1)
      vi.mocked(findCardById).mockResolvedValue({
        id: 1,
        title: 'Test Card',
        listId: 1,
        position: 0,
        description: null,
        dueDate: null,
        assigneeId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(findListById).mockResolvedValue({
        id: 2,
        name: 'In Progress',
        position: 1,
        boardId: 1,
      } as any)

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
      vi.mocked(moveCardWithActivity).mockResolvedValue({
        card: { id: 1, title: 'Test Card', listId: 2, position: 0 } as any,
        event: mockEvent as any,
      })

      const res = await request(app)
        .patch('/cards/1/move')
        .set('Authorization', 'Bearer test-token')
        .send({ targetListId: 2, position: 0 })

      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.event).toBeDefined()
      expect(res.body.event.eventType).toBe('card_moved')
      expect(moveCardWithActivity).toHaveBeenCalledWith(1, 2, 0, 1, 1, 1)
    })

    it('returns 404 when moving a card to a non-existent list', async () => {
      vi.mocked(verifyToken).mockReturnValue(1)
      vi.mocked(findCardById).mockResolvedValue({
        id: 1,
        title: 'Test Card',
        listId: 1,
        position: 0,
        description: null,
        dueDate: null,
        assigneeId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(findListById).mockResolvedValue(null)

      const res = await request(app)
        .patch('/cards/1/move')
        .set('Authorization', 'Bearer test-token')
        .send({ targetListId: 999, position: 0 })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Target list not found')
    })
  })

  describe('GET /boards/:id/activity/preview', () => {
    it('returns events in reverse chronological order without authentication', async () => {
      const events = [
        {
          id: 2,
          boardId: 1,
          actorId: 1,
          eventType: 'card_moved',
          cardId: 1,
          fromListId: 2,
          toListId: 3,
          createdAt: new Date('2026-04-10T12:00:00Z'),
          actorName: 'Alice',
          cardTitle: 'Card A',
          fromListName: 'In Progress',
          toListName: 'Done',
        },
        {
          id: 1,
          boardId: 1,
          actorId: 2,
          eventType: 'card_moved',
          cardId: 2,
          fromListId: 1,
          toListId: 2,
          createdAt: new Date('2026-04-10T11:00:00Z'),
          actorName: 'Bob',
          cardTitle: 'Card B',
          fromListName: 'Backlog',
          toListName: 'In Progress',
        },
      ]
      vi.mocked(findActivityByBoard).mockResolvedValue(events)

      const res = await request(app).get('/boards/1/activity/preview')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
      const firstDate = new Date(res.body[0].createdAt).getTime()
      const secondDate = new Date(res.body[1].createdAt).getTime()
      expect(firstDate).toBeGreaterThanOrEqual(secondDate)
    })
  })
})
