import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'

let token: string

beforeAll(async () => {
  const res = await request(app)
    .post('/users/login')
    .send({ email: 'alice@test.com', password: 'password123' })
  token = res.body.token
})

describe('Cards', () => {
  describe('GET /cards/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/cards/1')
      expect(res.status).toBe(401)
    })

    it('returns card with details', async () => {
      const res = await request(app)
        .get('/cards/1')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.title).toBeDefined()
    })

    it('returns 404 for non-existent card', async () => {
      const res = await request(app)
        .get('/cards/9999')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /cards', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/cards')
        .send({ title: 'Test', listId: 1 })
      expect(res.status).toBe(401)
    })

    it('creates a new card', async () => {
      const res = await request(app)
        .post('/cards')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Test Card', listId: 1 })
      expect(res.status).toBe(201)
      expect(res.body.title).toBe('New Test Card')
    })
  })

  describe('DELETE /cards/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/cards/5')
      expect(res.status).toBe(401)
    })
  })
})
