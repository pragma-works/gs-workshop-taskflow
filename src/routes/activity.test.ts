import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createActivityRouter } from './activity'
import { createCardsRouter } from './cards'
import type { ActivityService } from '../services/ActivityService'
import type { CardService } from '../services/CardService'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = 'super-secret-key-change-me'

function token(userId: number) {
  return `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`
}

function makeMockActivityService(): ActivityService {
  return {
    getFeedAuthenticated: vi.fn(),
    getFeedPreview: vi.fn(),
  } as unknown as ActivityService
}

function makeMockCardService(): CardService {
  return {
    getCard: vi.fn(),
    createCard: vi.fn(),
    moveCard: vi.fn(),
    addComment: vi.fn(),
    deleteCard: vi.fn(),
  } as unknown as CardService
}

function makeApp(activityService: ActivityService, cardService: CardService) {
  const app = express()
  app.use(express.json())
  app.use('/boards', createActivityRouter(activityService))
  app.use('/cards', createCardsRouter(cardService))
  return app
}

// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity', () => {
  let activityService: ActivityService
  let cardService: CardService

  beforeEach(() => {
    activityService = makeMockActivityService()
    cardService = makeMockCardService()
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(makeApp(activityService, cardService)).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 403 when the caller is not a member of the board', async () => {
    vi.mocked(activityService.getFeedAuthenticated).mockRejectedValueOnce(
      Object.assign(new Error('Not a board member'), { status: 403 }),
    )

    const res = await request(makeApp(activityService, cardService))
      .get('/boards/1/activity')
      .set('Authorization', token(99))

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({ error: 'Not a board member' })
  })

  it('returns 200 with events when authenticated member', async () => {
    const mockEvents = [
      { id: 1, boardId: 1, actorId: 1, eventType: 'card_moved', actorName: 'Alice' },
    ]
    vi.mocked(activityService.getFeedAuthenticated).mockResolvedValueOnce(mockEvents as any)

    const res = await request(makeApp(activityService, cardService))
      .get('/boards/1/activity')
      .set('Authorization', token(1))

    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockEvents)
  })
})

// ---------------------------------------------------------------------------

describe('PATCH /cards/:id/move', () => {
  let activityService: ActivityService
  let cardService: CardService

  beforeEach(() => {
    activityService = makeMockActivityService()
    cardService = makeMockCardService()
  })

  it('creates an ActivityEvent atomically with the card update', async () => {
    const userId = 42; const cardId = 7; const boardId = 3
    const fromListId = 10; const targetListId = 20

    const mockEvent = {
      id: 1, boardId, actorId: userId, eventType: 'card_moved',
      cardId, fromListId, toListId: targetListId, createdAt: new Date().toISOString(),
    }

    vi.mocked(cardService.moveCard).mockResolvedValueOnce(mockEvent as any)

    const res = await request(makeApp(activityService, cardService))
      .patch(`/cards/${cardId}/move`)
      .set('Authorization', token(userId))
      .send({ targetListId, position: 0 })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, event: { eventType: 'card_moved', fromListId, toListId: targetListId } })
    expect(cardService.moveCard).toHaveBeenCalledOnce()
  })

  it('returns 404 and never calls move when the card does not exist', async () => {
    vi.mocked(cardService.moveCard).mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { status: 404 }),
    )

    const res = await request(makeApp(activityService, cardService))
      .patch('/cards/999/move')
      .set('Authorization', token(1))
      .send({ targetListId: 1, position: 0 })

    expect(res.status).toBe(404)
  })

  it('returns 500 and rolls back cleanly when the transaction fails (e.g. non-existent target list)', async () => {
    vi.mocked(cardService.moveCard).mockRejectedValueOnce(
      new Error('Foreign key constraint failed on the field: `listId`'),
    )

    const res = await request(makeApp(activityService, cardService))
      .patch('/cards/5/move')
      .set('Authorization', token(1))
      .send({ targetListId: 9999, position: 0 })

    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      error:   'Move failed',
      details: expect.any(String),
    })
  })
})

// ---------------------------------------------------------------------------

describe('GET /boards/:id/activity/preview', () => {
  let activityService: ActivityService
  let cardService: CardService

  beforeEach(() => {
    activityService = makeMockActivityService()
    cardService = makeMockCardService()
  })

  it('returns events in reverse chronological order without requiring authentication', async () => {
    const now     = new Date()
    const earlier = new Date(now.getTime() - 60_000)

    const mockEvents = [
      {
        id: 2, boardId: 1, actorId: 1, eventType: 'card_moved', cardId: 1,
        fromListId: 1, toListId: 2, createdAt: now,
        actorName: 'Alice', cardTitle: 'Fix bug', fromListName: 'To Do', toListName: 'Done',
      },
      {
        id: 1, boardId: 1, actorId: 1, eventType: 'card_moved', cardId: 1,
        fromListId: null, toListId: null, createdAt: earlier,
        actorName: 'Alice', cardTitle: null, fromListName: null, toListName: null,
      },
    ]

    vi.mocked(activityService.getFeedPreview).mockResolvedValueOnce(mockEvents as any)

    const res = await request(makeApp(activityService, cardService)).get('/boards/1/activity/preview')

    expect(res.status).toBe(200)
    expect(activityService.getFeedPreview).toHaveBeenCalledWith(1)

    expect(res.body[0].id).toBe(2)
    expect(res.body[1].id).toBe(1)

    expect(res.body[0]).toMatchObject({
      actorName:    'Alice',
      cardTitle:    'Fix bug',
      fromListName: 'To Do',
      toListName:   'Done',
    })

    expect(res.body[1].cardTitle).toBeNull()
    expect(res.body[1].fromListName).toBeNull()
    expect(res.body[1].toListName).toBeNull()
  })
})
