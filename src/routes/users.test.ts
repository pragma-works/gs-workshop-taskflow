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

describe('Users', () => {
  describe('POST /users/login', () => {
    it('returns a token for valid credentials', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'alice@test.com', password: 'password123' })
      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
    })

    it('returns 401 for invalid email', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'nobody@test.com', password: 'password123' })
      expect(res.status).toBe(401)
    })

    it('returns 401 for invalid password', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'alice@test.com', password: 'wrongpassword' })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /users/register', () => {
    it('creates a new user without leaking password', async () => {
      const email = `register-${Date.now()}@test.com`
      const res = await request(app)
        .post('/users/register')
        .send({ email, password: 'testpass', name: 'Test User' })
      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Test User')
      expect(res.body.password).toBeUndefined()
    })
  })

  describe('GET /users/:id', () => {
    it('returns a user without password', async () => {
      const res = await request(app).get('/users/1')
      expect(res.status).toBe(200)
      expect(res.body.name).toBeDefined()
      expect(res.body.password).toBeUndefined()
    })

    it('returns 404 for non-existent user', async () => {
      const res = await request(app).get('/users/9999')
      expect(res.status).toBe(404)
    })
  })
})
