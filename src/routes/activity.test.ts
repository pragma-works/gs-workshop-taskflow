import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

// Mock prisma before importing routes
vi.mock('../db', () => ({
  default: {
    boardMember: {
      findUnique: vi.fn(),
    },
    activityEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import prisma from '../db'
import { JWT_SECRET } from '../auth'
import activityRouter from './activity'
import cardsRouter from './cards'

function makeToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET)
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/boards', activityRouter)
  app.use('/cards', cardsRouter)
  return app
}

const mockEvents = [
  {
    id: 2,
    boardId: 1,
    actorId: 1,
    eventType: 'card_moved',
    cardId: 3,
    fromListId: 1,
    toListId: 2,
    createdAt: new Date('2026-04-07T12:00:00.000Z'),
    actor: { name: 'Alice' },
    card: { title: 'Fix login redirect' },
    fromList: { name: 'Backlog' },
    toList: { name: 'In Progress' },
  },
  {
    id: 1,
    boardId: 1,
    actorId: 2,
    eventType: 'card_created',
    cardId: 1,
    fromListId: null,
    toListId: null,
    createdAt: new Date('2026-04-07T10:00:00.000Z'),
    actor: { name: 'Bob' },
    card: { title: 'Setup repo' },
    fromList: null,
    toList: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /boards/:id/activity', () => {
  it('returns 401 when no auth token is provided', async () => {
    const app = buildApp()
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when authenticated user is not a board member', async () => {
    ;(prisma.boardMember.findUnique as any).mockResolvedValue(null)
    const app = buildApp()
    const token = makeToken(99)
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('returns events in reverse chronological order for board members', async () => {
    ;(prisma.boardMember.findUnique as any).mockResolvedValue({ userId: 1, boardId: 1, role: 'member' })
    ;(prisma.activityEvent.findMany as any).mockResolvedValue(mockEvents)
    const app = buildApp()
    const token = makeToken(1)
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body[0].id).toBe(2)
    expect(res.body[0].actorName).toBe('Alice')
    expect(res.body[0].cardTitle).toBe('Fix login redirect')
  })
})

describe('PATCH /cards/:id/move', () => {
  it('creates an ActivityEvent in the same transaction as the card update', async () => {
    const mockCard = { id: 3, listId: 1, list: { boardId: 1, id: 1 } }
    const mockTargetList = { id: 2, boardId: 1 }
    const mockEvent = { id: 10, boardId: 1, actorId: 1, eventType: 'card_moved', cardId: 3, fromListId: 1, toListId: 2 }
    ;(prisma.card.findUnique as any).mockResolvedValue(mockCard)
    ;(prisma.list.findUnique as any).mockResolvedValue(mockTargetList)
    ;(prisma.$transaction as any).mockResolvedValue([mockCard, mockEvent])

    const app = buildApp()
    const token = makeToken(1)
    const res = await request(app)
      .patch('/cards/3/move')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 2, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.event).toMatchObject({ eventType: 'card_moved' })
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('returns 404 when moving a card to a non-existent list', async () => {
    const mockCard = { id: 3, listId: 1, list: { boardId: 1 } }
    ;(prisma.card.findUnique as any).mockResolvedValue(mockCard)
    ;(prisma.list.findUnique as any).mockResolvedValue(null)

    const app = buildApp()
    const token = makeToken(1)
    const res = await request(app)
      .patch('/cards/3/move')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetListId: 999, position: 0 })

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Target list not found' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns events in reverse chronological order without auth', async () => {
    ;(prisma.activityEvent.findMany as any).mockResolvedValue(mockEvents)
    const app = buildApp()
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].timestamp).toBe('2026-04-07T12:00:00.000Z')
    expect(res.body[1].timestamp).toBe('2026-04-07T10:00:00.000Z')
    expect(res.body[0].actorName).toBeDefined()
    expect(res.body[0].cardTitle).toBeDefined()
  })

  it('includes actorName and cardTitle in every event', async () => {
    ;(prisma.activityEvent.findMany as any).mockResolvedValue(mockEvents)
    const app = buildApp()
    const res = await request(app).get('/boards/1/activity/preview')
    for (const event of res.body) {
      expect(event).toHaveProperty('actorName')
      expect(event).toHaveProperty('cardTitle')
    }
  })
})
