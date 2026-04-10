import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    card:          { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    comment:       { findMany: vi.fn(), create: vi.fn() },
    cardLabel:     { findMany: vi.fn() },
    label:         { findUnique: vi.fn() },
    activityEvent: { create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import prisma from '../db'
import cardsRouter from './cards'

// ── helpers ────────────────────────────────────────────────────────────────────

const TOKEN_SECRET = 'super-secret-key-change-me'
const ACTOR_ID     = 42
const AUTH_HEADER  = `Bearer ${jwt.sign({ userId: ACTOR_ID }, TOKEN_SECRET)}`

const MOCK_CARD = {
  id: 5, title: 'Fix bug', description: 'details', position: 0,
  dueDate: null, listId: 2, assigneeId: null, createdAt: new Date(),
  list: { id: 2, boardId: 3, name: 'Backlog', position: 0 },
}
const MOCK_COMMENT = {
  id: 1, content: 'Looks good', createdAt: new Date(), cardId: 5, userId: ACTOR_ID,
}

const app = express()
app.use(express.json())
app.use('/cards', cardsRouter)

beforeEach(() => vi.clearAllMocks())

// ── GET /cards/:id ─────────────────────────────────────────────────────────────

describe('GET /cards/:id', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app).get('/cards/5')

    expect(res.status).toBe(401)
    expect(prisma.card.findUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when no card exists with that id', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/cards/999')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })

  it('returns the card with its comments and labels', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(MOCK_CARD as any)
    vi.mocked(prisma.comment.findMany).mockResolvedValue([MOCK_COMMENT] as any)
    vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/cards/5')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 5, title: 'Fix bug' })
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.labels).toEqual([])
  })

  it('resolves label details for each CardLabel row', async () => {
    const mockLabel    = { id: 3, name: 'bug', color: '#f00' }
    const mockCardLabel = { cardId: 5, labelId: 3 }

    vi.mocked(prisma.card.findUnique).mockResolvedValue(MOCK_CARD as any)
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([mockCardLabel] as any)
    vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any)

    const res = await request(app)
      .get('/cards/5')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body.labels).toHaveLength(1)
    expect(res.body.labels[0]).toMatchObject({ name: 'bug', color: '#f00' })
    expect(prisma.label.findUnique).toHaveBeenCalledWith({ where: { id: 3 } })
  })
})

// ── POST /cards ────────────────────────────────────────────────────────────────

describe('POST /cards', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app)
      .post('/cards')
      .send({ title: 'New task', listId: 2 })

    expect(res.status).toBe(401)
  })

  it('creates a card appended at the end of the list and returns 201', async () => {
    const newCard = { ...MOCK_CARD, id: 10, title: 'New task', position: 3 }
    vi.mocked(prisma.card.count).mockResolvedValue(3)
    vi.mocked(prisma.card.create).mockResolvedValue(newCard as any)

    const res = await request(app)
      .post('/cards')
      .set('Authorization', AUTH_HEADER)
      .send({ title: 'New task', listId: 2 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ title: 'New task', position: 3 })
    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'New task', listId: 2, position: 3 }),
      })
    )
  })
})

// ── POST /cards/:id/comments ───────────────────────────────────────────────────

describe('POST /cards/:id/comments', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app)
      .post('/cards/5/comments')
      .send({ content: 'Nice' })

    expect(res.status).toBe(401)
  })

  it('creates and returns the comment with 201', async () => {
    vi.mocked(prisma.comment.create).mockResolvedValue(MOCK_COMMENT as any)

    const res = await request(app)
      .post('/cards/5/comments')
      .set('Authorization', AUTH_HEADER)
      .send({ content: 'Looks good' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ content: 'Looks good', cardId: 5, userId: ACTOR_ID })
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'Looks good', cardId: 5, userId: ACTOR_ID }),
      })
    )
  })
})

// ── DELETE /cards/:id ──────────────────────────────────────────────────────────

describe('DELETE /cards/:id', () => {
  it('returns 401 when no Authorization header is supplied', async () => {
    const res = await request(app).delete('/cards/5')

    expect(res.status).toBe(401)
    expect(prisma.card.delete).not.toHaveBeenCalled()
  })

  it('deletes the card and returns { ok: true }', async () => {
    vi.mocked(prisma.card.delete).mockResolvedValue(MOCK_CARD as any)

    const res = await request(app)
      .delete('/cards/5')
      .set('Authorization', AUTH_HEADER)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 5 } })
  })
})
