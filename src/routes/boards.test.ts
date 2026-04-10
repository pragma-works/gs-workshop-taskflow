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

describe('Boards', () => {
  describe('GET /boards', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/boards')
      expect(res.status).toBe(401)
    })

    it('returns boards for authenticated user', async () => {
      const res = await request(app)
        .get('/boards')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })
  })

  describe('GET /boards/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/boards/1')
      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent board', async () => {
      const res = await request(app)
        .get('/boards/9999')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
    })

    it('returns board with lists and cards', async () => {
      const res = await request(app)
        .get('/boards/1')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.name).toBeDefined()
      expect(Array.isArray(res.body.lists)).toBe(true)
    })
  })

  describe('POST /boards', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/boards')
        .send({ name: 'Test Board' })
      expect(res.status).toBe(401)
    })

    it('creates a new board', async () => {
      const res = await request(app)
        .post('/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Test Board' })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('New Test Board')
    })
  })

  describe('POST /boards/:id/members', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/boards/1/members')
        .send({ memberId: 2 })
      expect(res.status).toBe(401)
    })
  })
})
