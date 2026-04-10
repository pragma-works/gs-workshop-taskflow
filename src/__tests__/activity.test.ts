/**
 * Integration tests for the activity feed endpoints and event logging.
 * Uses in-memory supertest against the Express app, with a real SQLite DB.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import { signToken } from '../middleware/auth'

let token: string
let boardId: number
let cardId: number
let listId: number

beforeAll(async () => {
  // Clean up and seed test data
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash('testpass', 10)
  const user = await prisma.user.create({ data: { email: 'test@example.com', password, name: 'Test' } })
  token = signToken(user.id)

  const board = await prisma.board.create({ data: { name: 'Test Board' } })
  boardId = board.id
  await prisma.boardMember.create({ data: { userId: user.id, boardId: board.id, role: 'owner' } })

  const list = await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId: board.id } })
  listId = list.id

  const card = await prisma.card.create({ data: { title: 'Test Card', position: 0, listId: list.id } })
  cardId = card.id
})

describe('GET /boards/:id/activity', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`/boards/${boardId}/activity`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app)
      .get('/boards/99999/activity')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('returns events array for authenticated board member', async () => {
    const res = await request(app)
      .get(`/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
  })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns events without auth', async () => {
    const res = await request(app).get(`/boards/${boardId}/activity/preview`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app).get('/boards/99999/activity/preview')
    expect(res.status).toBe(404)
  })

  it('returns at most 10 events', async () => {
    const res = await request(app).get(`/boards/${boardId}/activity/preview`)
    expect(res.body.events.length).toBeLessThanOrEqual(10)
  })
})

describe('PATCH /cards/:id/move — activity event logging', () => {
  it('writes a card_moved activity event atomically', async () => {
    const list2 = await prisma.list.create({ data: { name: 'Done', position: 1, boardId } })

    const before = await prisma.activityEvent.count({ where: { boardId, action: 'card_moved' } })

    const res = await request(app)
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: list2.id, position: 0 })

    expect(res.status).toBe(200)

    const after = await prisma.activityEvent.count({ where: { boardId, action: 'card_moved' } })
    expect(after).toBe(before + 1)
  })
})

describe('POST /cards/:id/comments — activity event logging', () => {
  it('writes a comment_added activity event', async () => {
    const before = await prisma.activityEvent.count({ where: { boardId, action: 'comment_added' } })

    const res = await request(app)
      .post(`/cards/${cardId}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello world' })

    expect(res.status).toBe(201)

    const after = await prisma.activityEvent.count({ where: { boardId, action: 'comment_added' } })
    expect(after).toBe(before + 1)
  })
})

describe('GET /boards/:id/activity — ordering and shape', () => {
  it('returns events newest first with correct shape', async () => {
    const res = await request(app)
      .get(`/boards/${boardId}/activity`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const events = res.body.events
    expect(events.length).toBeGreaterThan(0)

    const first = events[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('boardId', boardId)
    expect(first).toHaveProperty('userId')
    expect(first).toHaveProperty('action')
    expect(first).toHaveProperty('createdAt')

    // Verify newest-first ordering
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(events[i].createdAt).getTime()
      )
    }
  })
})
