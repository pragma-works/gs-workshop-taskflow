import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import { setupTestData, generateToken, cleanupTestData, testDb } from './setup'

describe('Activity Feed API', () => {
  let data: Awaited<ReturnType<typeof setupTestData>>
  let aliceToken: string
  let carolToken: string

  beforeEach(async () => {
    data = await setupTestData()
    aliceToken = generateToken(data.alice.id)
    carolToken = generateToken(data.carol.id)

    // Create some activity events by moving a card
    await request(app)
      .patch(`/cards/${data.card1.id}/move`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: data.inProgress.id, position: 0 })
  })

  afterAll(async () => {
    await cleanupTestData()
    await testDb.$disconnect()
  })

  describe('GET /boards/:id/activity', () => {
    it('returns activity events for authenticated board member', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}/activity`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('events')
      expect(Array.isArray(res.body.events)).toBe(true)
      expect(res.body.events.length).toBeGreaterThan(0)

      const event = res.body.events[0]
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('boardId', data.board.id)
      expect(event).toHaveProperty('userId')
      expect(event).toHaveProperty('action')
      expect(event).toHaveProperty('createdAt')
    })

    it('returns events in reverse chronological order', async () => {
      // Add another event
      await request(app)
        .post(`/cards/${data.card1.id}/comments`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Activity order test' })

      const res = await request(app)
        .get(`/boards/${data.board.id}/activity`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      const events = res.body.events
      expect(events.length).toBeGreaterThanOrEqual(2)

      // Verify newest first
      for (let i = 0; i < events.length - 1; i++) {
        const curr = new Date(events[i].createdAt).getTime()
        const next = new Date(events[i + 1].createdAt).getTime()
        expect(curr).toBeGreaterThanOrEqual(next)
      }
    })

    it('returns 401 without auth token', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}/activity`)

      expect(res.status).toBe(401)
    })

    it('returns 403 for non-member', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}/activity`)
        .set('Authorization', `Bearer ${carolToken}`)

      expect(res.status).toBe(403)
    })

    it('returns 404 for non-existent board', async () => {
      const res = await request(app)
        .get('/boards/99999/activity')
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /boards/:id/activity/preview', () => {
    it('returns activity events without authentication', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}/activity/preview`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('events')
      expect(Array.isArray(res.body.events)).toBe(true)
    })

    it('returns maximum 10 events', async () => {
      // Create many events
      for (let i = 0; i < 12; i++) {
        await request(app)
          .post(`/cards/${data.card1.id}/comments`)
          .set('Authorization', `Bearer ${aliceToken}`)
          .send({ content: `Comment ${i}` })
      }

      const res = await request(app)
        .get(`/boards/${data.board.id}/activity/preview`)

      expect(res.status).toBe(200)
      expect(res.body.events.length).toBeLessThanOrEqual(10)
    })

    it('returns 404 for non-existent board', async () => {
      const res = await request(app)
        .get('/boards/99999/activity/preview')

      expect(res.status).toBe(404)
    })
  })
})
