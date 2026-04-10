import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    card:          { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    list:          { findUnique: vi.fn() },
    boardMember:   { findUnique: vi.fn() },
    comment:       { create: vi.fn() },
    activityEvent: { create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import app from '../index'
import prisma from '../db'
import { JWT_SECRET } from '../lib/auth'

const db = prisma as any
const bearerToken = (userId: number) => `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`

const mockCard = {
  id: 10, title: 'Fix bug', description: null, position: 0,
  listId: 2, assigneeId: 1, createdAt: new Date(),
  list:     { boardId: 1 },
  comments: [],
  labels:   [],
}
const membership = { userId: 1, boardId: 1, role: 'member' }
const mockEvent  = { id: 5, eventType: 'card_moved', cardId: 10 }

beforeEach(() => vi.clearAllMocks())

// ── GET /cards/:id ────────────────────────────────────────────────────────

describe('GET /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/cards/10')
    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/cards/10')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 403 when the caller is not a board member', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/cards/10')
      .set('Authorization', bearerToken(99))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
  })

  it('fetches card with labels and comments using include — no N+1', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(membership)
    const res = await request(app)
      .get('/cards/10')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(db.card.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          comments: true,
          labels:   expect.objectContaining({ include: { label: true } }),
        }),
      })
    )
  })
})

// ── POST /cards ───────────────────────────────────────────────────────────

describe('POST /cards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/cards').send({ title: 'Task', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('sets position from a count query and wraps both in a transaction', async () => {
    const created = { ...mockCard, id: 11, position: 3 }
    db.$transaction.mockImplementation(async (fn: (tx: typeof db) => Promise<unknown>) => fn(db))
    db.card.count.mockResolvedValue(3)
    db.card.create.mockResolvedValue(created)
    db.list.findUnique.mockResolvedValue({ id: 2, boardId: 1 })
    db.boardMember.findUnique.mockResolvedValue(membership)

    const res = await request(app)
      .post('/cards')
      .set('Authorization', bearerToken(1))
      .send({ title: 'New Task', listId: 2 })

    expect(res.status).toBe(201)
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.card.count).toHaveBeenCalledWith({ where: { listId: 2 } })
    expect(db.card.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 3 }) })
    )
  })
})

// ── PATCH /cards/:id/move ─────────────────────────────────────────────────

describe('PATCH /cards/:id/move', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/cards/10/move').send({ targetListId: 3, position: 0 })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 3, position: 0 })
    expect(res.status).toBe(404)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('returns 403 and does not execute the transaction when the caller is not a board member', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.list.findUnique.mockResolvedValue({ id: 3, boardId: 1 })
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(99))
      .send({ targetListId: 3, position: 0 })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('moves the card and creates an ActivityEvent in a single transaction', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.list.findUnique.mockResolvedValue({ id: 3, boardId: 1 })
    db.boardMember.findUnique.mockResolvedValue(membership)
    db.card.update.mockResolvedValue({ ...mockCard, listId: 3 })
    db.activityEvent.create.mockResolvedValue(mockEvent)
    db.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 3, position: 1 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, event: mockEvent })
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.activityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType:  'card_moved',
          fromListId: 2,
          toListId:   3,
          actorId:    1,
          boardId:    1,
        }),
      })
    )
  })

  it('returns 500 without internal details when the transaction fails', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.list.findUnique.mockResolvedValue({ id: 9999, boardId: 1 })
    db.boardMember.findUnique.mockResolvedValue(membership)
    db.card.update.mockResolvedValue({})
    db.activityEvent.create.mockResolvedValue({})
    db.$transaction.mockRejectedValue(new Error('Foreign key constraint failed'))

    const res = await request(app)
      .patch('/cards/10/move')
      .set('Authorization', bearerToken(1))
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Move failed' })
    expect(res.body).not.toHaveProperty('details')
  })
})

// ── POST /cards/:id/comments ──────────────────────────────────────────────

describe('POST /cards/:id/comments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/cards/10/comments').send({ content: 'hi' })
    expect(res.status).toBe(401)
  })

  it('creates a comment linked to the card and the authenticated user', async () => {
    const mockComment = { id: 1, content: 'hi', cardId: 10, userId: 1, createdAt: new Date() }
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(membership)
    db.comment.create.mockResolvedValue(mockComment)
    const res = await request(app)
      .post('/cards/10/comments')
      .set('Authorization', bearerToken(1))
      .send({ content: 'hi' })
    expect(res.status).toBe(201)
    expect(db.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content: 'hi', cardId: 10, userId: 1 } })
    )
  })
})

// ── DELETE /cards/:id ─────────────────────────────────────────────────────

describe('DELETE /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/cards/10')
    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist and does not call delete', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .delete('/cards/10')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(404)
    expect(db.card.delete).not.toHaveBeenCalled()
  })

  it('returns 403 and does not delete when the caller is not a board member', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .delete('/cards/10')
      .set('Authorization', bearerToken(99))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Not a board member' })
    expect(db.card.delete).not.toHaveBeenCalled()
  })

  it('deletes the card when the caller is a board member', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(membership)
    db.card.delete.mockResolvedValue(mockCard)
    const res = await request(app)
      .delete('/cards/10')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(db.card.delete).toHaveBeenCalledWith({ where: { id: 10 } })
  })
})

// ── Targeted: kill error-body, where-clause, and include survivors ────────

describe('GET /cards/:id — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).get('/cards/10')
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns { error: "Not found" } as the body on 404', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app).get('/cards/10').set('Authorization', bearerToken(1))
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('queries card by exact id with exact include structure', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(membership)
    await request(app).get('/cards/10').set('Authorization', bearerToken(1))
    // Second call fetches full card with comments and labels
    expect(db.card.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: {
        comments: true,
        labels: { include: { label: true } },
      },
    })
  })
})

describe('POST /cards — response body precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).post('/cards').send({ title: 'x', listId: 1 })
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('PATCH /cards/:id/move — response body precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).patch('/cards/10/move').send({ targetListId: 3, position: 0 })
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('POST /cards/:id/comments — response body precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).post('/cards/10/comments').send({ content: 'x' })
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('DELETE /cards/:id — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).delete('/cards/10')
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns { error: "Not found" } as the body on 404', async () => {
    db.card.findUnique.mockResolvedValue(null)
    const res = await request(app).delete('/cards/10').set('Authorization', bearerToken(1))
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('fetches the card by exact id with include: { list: true }', async () => {
    db.card.findUnique.mockResolvedValue(mockCard)
    db.boardMember.findUnique.mockResolvedValue(null)
    await request(app).delete('/cards/10').set('Authorization', bearerToken(1))
    expect(db.card.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: { list: true },
    })
  })

  it('checks board membership with exact userId and boardId', async () => {
    db.card.findUnique.mockResolvedValue(mockCard) // mockCard.list.boardId === 1
    db.boardMember.findUnique.mockResolvedValue(null)
    await request(app).delete('/cards/10').set('Authorization', bearerToken(42))
    expect(db.boardMember.findUnique).toHaveBeenCalledWith({
      where: { userId_boardId: { userId: 42, boardId: 1 } },
    })
  })
})
