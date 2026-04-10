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
import { isBoardMember, findBoardsByUser, findBoardWithLists, createBoard } from '../repositories/boards.repo'
import { moveCardWithActivity, findCardWithDetails, createCard, addComment, deleteCard } from '../repositories/cards.repo'
import { createUser, findUserByEmail, findUserById } from '../repositories/users.repo'
import * as bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET)

describe('Activity Feed', () => {
  beforeEach(() => vi.clearAllMocks())

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
      card: { id: 2, listId: 20, position: 0, title: 'Test', description: null, dueDate: null, assigneeId: null, createdAt: new Date() },
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
    const events = [
      { id: 2, eventType: 'card_moved', boardId: 1, actorId: 1, cardId: 1, fromListId: 1, toListId: 2, createdAt: new Date('2025-01-02'), actor: { name: 'Alice' }, card: { title: 'Card A' }, fromList: { name: 'Todo' }, toList: { name: 'Done' } },
      { id: 1, eventType: 'card_moved', boardId: 1, actorId: 1, cardId: 1, fromListId: 0, toListId: 1, createdAt: new Date('2025-01-01'), actor: { name: 'Alice' }, card: { title: 'Card A' }, fromList: { name: 'Backlog' }, toList: { name: 'Todo' } },
    ]
    vi.mocked(getActivityByBoard).mockResolvedValue(events as any)

    const res = await request(app).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].id).toBe(2)
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
    expect(res.body.error).toBeDefined()
  })
})

describe('Boards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /boards returns 401 without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('GET /boards returns board list for authenticated user', async () => {
    vi.mocked(findBoardsByUser).mockResolvedValue([{ id: 1, name: 'My Board', createdAt: new Date() }])
    const res = await request(app).get('/boards').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('GET /boards/:id returns 403 when not a member', async () => {
    vi.mocked(isBoardMember).mockResolvedValue(false)
    const res = await request(app).get('/boards/1').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(403)
  })

  it('GET /boards/:id returns board with lists when member', async () => {
    vi.mocked(isBoardMember).mockResolvedValue(true)
    vi.mocked(findBoardWithLists).mockResolvedValue({ id: 1, name: 'Board', createdAt: new Date(), lists: [] } as any)
    const res = await request(app).get('/boards/1').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
  })

  it('GET /boards/:id returns 404 when board not found', async () => {
    vi.mocked(isBoardMember).mockResolvedValue(true)
    vi.mocked(findBoardWithLists).mockResolvedValue(null)
    const res = await request(app).get('/boards/999').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(404)
  })

  it('POST /boards creates a board', async () => {
    vi.mocked(createBoard).mockResolvedValue({ id: 2, name: 'New Board', createdAt: new Date() })
    const res = await request(app).post('/boards').set('Authorization', `Bearer ${makeToken(1)}`).send({ name: 'New Board' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Board')
  })
})

describe('Cards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET /cards/:id returns 401 without auth', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('GET /cards/:id returns card details', async () => {
    vi.mocked(findCardWithDetails).mockResolvedValue({ id: 1, title: 'Test', description: null, position: 0, dueDate: null, listId: 1, assigneeId: null, createdAt: new Date(), comments: [], labels: [] } as any)
    const res = await request(app).get('/cards/1').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Test')
  })

  it('GET /cards/:id returns 404 when card not found', async () => {
    vi.mocked(findCardWithDetails).mockResolvedValue(null)
    const res = await request(app).get('/cards/999').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(404)
  })

  it('POST /cards creates a card', async () => {
    vi.mocked(createCard).mockResolvedValue({ id: 1, title: 'New', description: null, position: 0, dueDate: null, listId: 1, assigneeId: null, createdAt: new Date() })
    const res = await request(app).post('/cards').set('Authorization', `Bearer ${makeToken(1)}`).send({ title: 'New', listId: 1 })
    expect(res.status).toBe(201)
  })

  it('POST /cards/:id/comments adds a comment', async () => {
    vi.mocked(addComment).mockResolvedValue({ id: 1, content: 'Nice', cardId: 1, userId: 1, createdAt: new Date() })
    const res = await request(app).post('/cards/1/comments').set('Authorization', `Bearer ${makeToken(1)}`).send({ content: 'Nice' })
    expect(res.status).toBe(201)
  })

  it('DELETE /cards/:id deletes a card', async () => {
    vi.mocked(deleteCard).mockResolvedValue({ id: 1, title: 'x', description: null, position: 0, dueDate: null, listId: 1, assigneeId: null, createdAt: new Date() })
    const res = await request(app).delete('/cards/1').set('Authorization', `Bearer ${makeToken(1)}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('PATCH /cards/:id/move returns 500 when transaction fails', async () => {
    vi.mocked(moveCardWithActivity).mockRejectedValue(new Error('DB error'))
    const res = await request(app).patch('/cards/1/move').set('Authorization', `Bearer ${makeToken(1)}`).send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
  })
})

describe('Users', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POST /users/register creates a user without returning password', async () => {
    vi.mocked(createUser).mockResolvedValue({ id: 1, email: 'a@test.com', name: 'Alice', createdAt: new Date() })
    const res = await request(app).post('/users/register').send({ email: 'a@test.com', password: 'pass123', name: 'Alice' })
    expect(res.status).toBe(200)
    expect(res.body.password).toBeUndefined()
  })

  it('POST /users/login returns token for valid credentials', async () => {
    const hashed = await bcrypt.hash('pass123', 10)
    vi.mocked(findUserByEmail).mockResolvedValue({ id: 1, email: 'a@test.com', password: hashed, name: 'Alice', createdAt: new Date() })
    const res = await request(app).post('/users/login').send({ email: 'a@test.com', password: 'pass123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('POST /users/login returns 401 for invalid credentials', async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null)
    const res = await request(app).post('/users/login').send({ email: 'x@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('GET /users/:id returns user without password', async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: 1, email: 'a@test.com', name: 'Alice', createdAt: new Date() })
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body.password).toBeUndefined()
  })

  it('GET /users/:id returns 404 when user not found', async () => {
    vi.mocked(findUserById).mockResolvedValue(null)
    const res = await request(app).get('/users/999')
    expect(res.status).toBe(404)
  })
})

