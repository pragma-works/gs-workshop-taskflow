import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

const prismaMock = vi.hoisted(() => ({
  card: {
    findUnique: vi.fn(),
    create:     vi.fn(),
    update:     vi.fn(),
    count:      vi.fn(),
    delete:     vi.fn(),
  },
  comment: {
    findMany: vi.fn(),
    create:   vi.fn(),
  },
  cardLabel: {
    findMany: vi.fn(),
  },
  label: {
    findUnique: vi.fn(),
  },
  activityEvent: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('../db', () => ({ default: prismaMock }))

import cardsRouter from './cards'

const JWT_SECRET = 'super-secret-key-change-me'
const makeToken = (userId: number) => jwt.sign({ userId }, JWT_SECRET)

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/cards', cardsRouter)
  return app
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Cards routes', () => {
  const app = buildApp()

  beforeEach(() => vi.resetAllMocks())

  // ── GET /cards/:id ───────────────────────────────────────────────────────

  it('returns 401 for GET /cards/:id when the request has no auth token', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 for GET /cards/:id when the card does not exist', async () => {
    prismaMock.card.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/cards/99')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })

  it('returns the card with its comments and labels for GET /cards/:id', async () => {
    const card = { id: 1, title: 'Fix bug', position: 0, listId: 10, assigneeId: null, createdAt: new Date() }
    prismaMock.card.findUnique.mockResolvedValue(card)
    prismaMock.comment.findMany.mockResolvedValue([{ id: 5, content: 'LGTM', cardId: 1, userId: 2, createdAt: new Date() }])
    prismaMock.cardLabel.findMany.mockResolvedValue([{ cardId: 1, labelId: 3 }])
    prismaMock.label.findUnique.mockResolvedValue({ id: 3, name: 'bug', color: 'red' })

    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, title: 'Fix bug' })
    expect(res.body.comments).toHaveLength(1)
    expect(res.body.labels).toHaveLength(1)
    expect(res.body.labels[0]).toMatchObject({ name: 'bug', color: 'red' })
  })

  // ── POST /cards ──────────────────────────────────────────────────────────

  it('returns 401 for POST /cards when the request has no auth token', async () => {
    const res = await request(app).post('/cards').send({ title: 'New', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('creates a card with an auto-calculated position on POST /cards', async () => {
    prismaMock.card.count.mockResolvedValue(3)
    const created = { id: 10, title: 'New task', description: null, position: 3, listId: 1, assigneeId: null, createdAt: new Date() }
    prismaMock.card.create.mockResolvedValue(created)

    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ title: 'New task', listId: 1 })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 10, title: 'New task', position: 3 })
    expect(prismaMock.card.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ position: 3, listId: 1 }),
    })
  })

  // ── POST /cards/:id/comments ─────────────────────────────────────────────

  it('returns 401 for POST /cards/:id/comments when the request has no auth token', async () => {
    const res = await request(app).post('/cards/1/comments').send({ content: 'hi' })
    expect(res.status).toBe(401)
  })

  it('creates and returns a comment on POST /cards/:id/comments', async () => {
    const comment = { id: 20, content: 'Nice work', cardId: 1, userId: 2, createdAt: new Date().toISOString() }
    prismaMock.comment.create.mockResolvedValue(comment)

    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${makeToken(2)}`)
      .send({ content: 'Nice work' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ id: 20, content: 'Nice work', cardId: 1, userId: 2 })
    expect(prismaMock.comment.create).toHaveBeenCalledWith({
      data: { content: 'Nice work', cardId: 1, userId: 2 },
    })
  })

  // ── DELETE /cards/:id ────────────────────────────────────────────────────

  it('returns 401 for DELETE /cards/:id when the request has no auth token', async () => {
    const res = await request(app).delete('/cards/1')
    expect(res.status).toBe(401)
  })

  it('deletes the card and returns { ok: true } on DELETE /cards/:id', async () => {
    prismaMock.card.delete.mockResolvedValue({})

    const res = await request(app)
      .delete('/cards/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
    expect(prismaMock.card.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
