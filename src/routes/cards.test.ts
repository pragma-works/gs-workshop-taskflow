process.env.JWT_SECRET = 'test-secret'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../services/cardService', () => ({
  getCardById:  vi.fn(),
  createCard:   vi.fn(),
  moveCard:     vi.fn(),
  addComment:   vi.fn(),
  deleteCard:   vi.fn(),
}))

vi.mock('../services/boardService', () => ({
  getMembership: vi.fn(),
}))

import app from '../index'
import { getCardById, createCard, moveCard, addComment, deleteCard } from '../services/cardService'
import { getMembership } from '../services/boardService'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, 'test-secret')
}

const mockCard = (overrides = {}) => ({
  id: 1, title: 'Fix bug', description: null, position: 0,
  dueDate: null, listId: 10, assigneeId: null, createdAt: new Date(),
  list: { id: 10, boardId: 99, name: 'To Do', position: 0 },
  comments: [], labels: [],
  ...overrides,
})

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------
// GET /cards/:id
// ---------------------------------------------------------------------------
describe('GET /cards/:id', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when card does not exist', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/cards/99')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 200 with card data when found', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)

    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
    expect(res.body.title).toBe('Fix bug')
  })
})

// ---------------------------------------------------------------------------
// POST /cards
// ---------------------------------------------------------------------------
describe('POST /cards', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/cards').send({ title: 'T', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('returns 201 with the created card', async () => {
    const card = mockCard({ id: 5, title: 'New task' })
    vi.mocked(createCard).mockResolvedValueOnce(card as any)

    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ title: 'New task', listId: 10 })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('New task')
    expect(createCard).toHaveBeenCalledWith('New task', undefined, 10, undefined)
  })
})

// ---------------------------------------------------------------------------
// PATCH /cards/:id/move
// ---------------------------------------------------------------------------
describe('PATCH /cards/:id/move', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).patch('/cards/1/move').send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 when card does not exist', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(null)

    const res = await request(app)
      .patch('/cards/99/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce(null)

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 20, position: 1 })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns 200 with result when move succeeds', async () => {
    const event = { id: 1, eventType: 'card_moved', boardId: 99 }
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 1, boardId: 99, role: 'member' } as any)
    vi.mocked(moveCard).mockResolvedValueOnce({ ok: true, event } as any)

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 20, position: 1 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event.eventType).toBe('card_moved')
  })

  it('returns 404 when moveCard throws Not found', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 1, boardId: 99, role: 'member' } as any)
    vi.mocked(moveCard).mockRejectedValueOnce(new Error('Not found'))

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 500 with details when moveCard throws unexpected error', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 1, boardId: 99, role: 'member' } as any)
    vi.mocked(moveCard).mockRejectedValueOnce(new Error('FK constraint failed'))

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(res.body.details).toBe('FK constraint failed')
  })

  it('returns 500 with string details when moveCard throws a non-Error value', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 1, boardId: 99, role: 'member' } as any)
    vi.mocked(moveCard).mockRejectedValueOnce('raw string error')

    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Move failed')
    expect(res.body.details).toBe('raw string error')
  })
})

// ---------------------------------------------------------------------------
// POST /cards/:id/comments
// ---------------------------------------------------------------------------
describe('POST /cards/:id/comments', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/cards/1/comments').send({ content: 'hi' })
    expect(res.status).toBe(401)
  })

  it('returns 201 with the created comment', async () => {
    const comment = { id: 3, content: 'Looks good', cardId: 1, userId: 7, createdAt: new Date() }
    vi.mocked(addComment).mockResolvedValueOnce(comment as any)

    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${makeToken(7)}`)
      .send({ content: 'Looks good' })

    expect(res.status).toBe(201)
    expect(res.body.content).toBe('Looks good')
    expect(addComment).toHaveBeenCalledWith(1, 7, 'Looks good')
  })
})

// ---------------------------------------------------------------------------
// DELETE /cards/:id
// ---------------------------------------------------------------------------
describe('DELETE /cards/:id', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when card does not exist', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(null)

    const res = await request(app)
      .delete('/cards/99')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 403 when caller is not a board member', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce(null)

    const res = await request(app)
      .delete('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('returns 200 when card is successfully deleted', async () => {
    vi.mocked(getCardById).mockResolvedValueOnce(mockCard() as any)
    vi.mocked(getMembership).mockResolvedValueOnce({ userId: 1, boardId: 99, role: 'member' } as any)
    vi.mocked(deleteCard).mockResolvedValueOnce(undefined as any)

    const res = await request(app)
      .delete('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(deleteCard).toHaveBeenCalledWith(1)
  })
})
