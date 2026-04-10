import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    card:        { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    comment:     { findMany: vi.fn(), create: vi.fn() },
    cardLabel:   { findMany: vi.fn() },
    label:       { findUnique: vi.fn() },
    activityEvent: { create: vi.fn() },
    $transaction:  vi.fn(),
  },
}))

import prisma from '../db'
import cardsRouter from './cards'

const app = express()
app.use(express.json())
app.use('/cards', cardsRouter)

const SECRET = 'super-secret-key-change-me'
const token = (userId = 1) => jwt.sign({ userId }, SECRET)

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------

describe('GET /cards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when the card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(404)
  })

  it('returns the card with its comments and labels', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(
      { id: 1, title: 'Fix login', listId: 1, position: 0, createdAt: new Date() } as any,
    )
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([])

    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Fix login')
    expect(res.body.comments).toEqual([])
    expect(res.body.labels).toEqual([])
  })
})

// ---------------------------------------------------------------------------

describe('POST /cards', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/cards').send({ title: 'Task', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('creates a card and appends it to the list', async () => {
    vi.mocked(prisma.card.count).mockResolvedValue(2)
    vi.mocked(prisma.card.create).mockResolvedValue(
      { id: 10, title: 'Task', listId: 1, position: 2, createdAt: new Date() } as any,
    )

    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Task', listId: 1 })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Task')
    expect(vi.mocked(prisma.card.create)).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 2 }) }),
    )
  })
})

// ---------------------------------------------------------------------------

describe('POST /cards/:id/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/cards/1/comments').send({ content: 'Hello' })
    expect(res.status).toBe(401)
  })

  it('creates and returns the new comment', async () => {
    const mockComment = { id: 1, content: 'Hello', cardId: 1, userId: 1, createdAt: new Date() }
    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any)

    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${token()}`)
      .send({ content: 'Hello' })

    expect(res.status).toBe(201)
    expect(res.body.content).toBe('Hello')
  })
})

// ---------------------------------------------------------------------------

describe('DELETE /cards/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/cards/1')
    expect(res.status).toBe(401)
  })

  it('deletes the card and returns ok', async () => {
    vi.mocked(prisma.card.delete).mockResolvedValue({} as any)

    const res = await request(app)
      .delete('/cards/1')
      .set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(vi.mocked(prisma.card.delete)).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
