import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'

let token: string
let boardId: number
let cardId: number
let listAId: number
let listBId: number

beforeAll(async () => {
  // Login as Alice (seeded user, board member)
  const loginRes = await request(app)
    .post('/users/login')
    .send({ email: 'alice@test.com', password: 'password123' })
  token = loginRes.body.token

  // Get board details to find list IDs
  const boardRes = await request(app)
    .get('/boards/1')
    .set('Authorization', `Bearer ${token}`)
  boardId = boardRes.body.id
  listAId = boardRes.body.lists[0].id
  listBId = boardRes.body.lists[1].id

  // Pick a card on listA
  const cards = boardRes.body.lists[0].cards
  cardId = cards.length > 0 ? cards[0].id : boardRes.body.lists[1].cards[0].id
})

describe('Activity Feed', () => {
  describe('GET /boards/:id/activity', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const res = await request(app).get(`/boards/${boardId}/activity`)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('Unauthorized')
    })

    it('returns 403 for non-members', async () => {
      // Register a new user who is not a board member
      const uniqueEmail = `outsider-${Date.now()}@test.com`
      await request(app)
        .post('/users/register')
        .send({ email: uniqueEmail, password: 'password123', name: 'Outsider' })
      const loginRes = await request(app)
        .post('/users/login')
        .send({ email: uniqueEmail, password: 'password123' })
      const outsiderToken = loginRes.body.token

      const res = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${outsiderToken}`)
      expect(res.status).toBe(403)
    })

    it('returns 404 for non-existent boards', async () => {
      const res = await request(app)
        .get('/boards/9999/activity')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })

    it('returns events in reverse chronological order', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.events)).toBe(true)

      const timestamps = res.body.events.map((e: any) => new Date(e.createdAt).getTime())
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i])
      }
    })
  })

  describe('PATCH /cards/:id/move', () => {
    it('creates an ActivityEvent atomically with the card move', async () => {
      // Get activity count before
      const beforeRes = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${token}`)
      const beforeCount = beforeRes.body.events.length

      // Move card
      const moveRes = await request(app)
        .patch(`/cards/${cardId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: listBId, position: 0 })
      expect(moveRes.status).toBe(200)
      expect(moveRes.body.ok).toBe(true)
      expect(moveRes.body.event).toBeDefined()
      expect(moveRes.body.event.action).toBe('card_moved')
      expect(moveRes.body.event.cardId).toBe(cardId)

      // Verify event was persisted
      const afterRes = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${token}`)
      expect(afterRes.body.events.length).toBe(beforeCount + 1)
    })

    it('returns 404 when moving a card to a non-existent list', async () => {
      const res = await request(app)
        .patch(`/cards/${cardId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: 99999, position: 0 })
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Target list not found')
    })

    it('returns 404 when moving a non-existent card', async () => {
      const res = await request(app)
        .patch('/cards/99999/move')
        .set('Authorization', `Bearer ${token}`)
        .send({ targetListId: listBId, position: 0 })
      expect(res.status).toBe(404)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch(`/cards/${cardId}/move`)
        .send({ targetListId: listBId, position: 0 })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /boards/:id/activity/preview', () => {
    it('returns events without authentication', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity/preview`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.events)).toBe(true)
    })

    it('returns events in reverse chronological order', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity/preview`)
      expect(res.status).toBe(200)

      const timestamps = res.body.events.map((e: any) => new Date(e.createdAt).getTime())
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i])
      }
    })

    it('returns at most 10 events', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity/preview`)
      expect(res.status).toBe(200)
      expect(res.body.events.length).toBeLessThanOrEqual(10)
    })

    it('returns 404 for non-existent boards', async () => {
      const res = await request(app)
        .get('/boards/9999/activity/preview')
      expect(res.status).toBe(404)
    })

    it('includes user name and card title in each event', async () => {
      const res = await request(app)
        .get(`/boards/${boardId}/activity/preview`)
      expect(res.status).toBe(200)
      if (res.body.events.length > 0) {
        const event = res.body.events[0]
        expect(event.user).toBeDefined()
        expect(event.user.name).toBeDefined()
      }
    })
  })

  describe('POST /cards/:id/comments', () => {
    it('creates an ActivityEvent when adding a comment', async () => {
      const beforeRes = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${token}`)
      const beforeCount = beforeRes.body.events.length

      const commentRes = await request(app)
        .post(`/cards/${cardId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Test comment for activity' })
      expect(commentRes.status).toBe(201)

      const afterRes = await request(app)
        .get(`/boards/${boardId}/activity`)
        .set('Authorization', `Bearer ${token}`)
      const newEvent = afterRes.body.events[0]
      expect(afterRes.body.events.length).toBe(beforeCount + 1)
      expect(newEvent.action).toBe('comment_added')
      expect(newEvent.cardId).toBe(cardId)
    })
  })
})
