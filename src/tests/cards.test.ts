import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import { setupTestData, generateToken, cleanupTestData, testDb } from './setup'

describe('Cards API', () => {
  let data: Awaited<ReturnType<typeof setupTestData>>
  let aliceToken: string

  beforeEach(async () => {
    data = await setupTestData()
    aliceToken = generateToken(data.alice.id)
  })

  afterAll(async () => {
    await cleanupTestData()
    await testDb.$disconnect()
  })

  describe('GET /cards/:id', () => {
    it('returns card with comments and labels', async () => {
      const res = await request(app)
        .get(`/cards/${data.card1.id}`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('title', 'Test Card 1')
      expect(res.body).toHaveProperty('comments')
      expect(res.body).toHaveProperty('labels')
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`/cards/${data.card1.id}`)
      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app)
        .get('/cards/99999')
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(404)
    })
  })

  describe('POST /cards', () => {
    it('creates a new card', async () => {
      const res = await request(app)
        .post('/cards')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ title: 'New Card', listId: data.backlog.id })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('title', 'New Card')
      expect(res.body).toHaveProperty('position')
    })
  })

  describe('PATCH /cards/:id/move', () => {
    it('moves card and creates ActivityEvent atomically', async () => {
      const res = await request(app)
        .patch(`/cards/${data.card1.id}/move`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ targetListId: data.inProgress.id, position: 0 })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('ok', true)
      expect(res.body).toHaveProperty('event')
      expect(res.body.event).toHaveProperty('action', 'card_moved')
      expect(res.body.event).toHaveProperty('boardId', data.board.id)
      expect(res.body.event).toHaveProperty('cardId', data.card1.id)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch(`/cards/${data.card1.id}/move`)
        .send({ targetListId: data.inProgress.id, position: 0 })

      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app)
        .patch('/cards/99999/move')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ targetListId: data.inProgress.id, position: 0 })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /cards/:id/comments', () => {
    it('creates comment and ActivityEvent atomically', async () => {
      const res = await request(app)
        .post(`/cards/${data.card1.id}/comments`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Hello world' })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('content', 'Hello world')
      expect(res.body).toHaveProperty('cardId', data.card1.id)

      // Verify activity event was created
      const activityRes = await request(app)
        .get(`/boards/${data.board.id}/activity/preview`)

      expect(activityRes.body.events.length).toBeGreaterThan(0)
      const commentEvent = activityRes.body.events.find(
        (e: any) => e.action === 'comment_added'
      )
      expect(commentEvent).toBeDefined()
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app)
        .post('/cards/99999/comments')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: 'Hello' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /cards/:id', () => {
    it('deletes a card', async () => {
      const res = await request(app)
        .delete(`/cards/${data.card2.id}`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })

      // Verify card is gone
      const getRes = await request(app)
        .get(`/cards/${data.card2.id}`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(getRes.status).toBe(404)
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app)
        .delete('/cards/99999')
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(404)
    })
  })
})
