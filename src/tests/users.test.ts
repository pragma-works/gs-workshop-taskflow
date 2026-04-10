import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import { setupTestData, generateToken, cleanupTestData, testDb } from './setup'

describe('Users API', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  afterAll(async () => {
    await cleanupTestData()
    await testDb.$disconnect()
  })

  describe('POST /users/register', () => {
    it('creates a new user and does not return password', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ email: 'newuser@test.com', password: 'pass123', name: 'New User' })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('email', 'newuser@test.com')
      expect(res.body).toHaveProperty('name', 'New User')
      expect(res.body).not.toHaveProperty('password')
    })
  })

  describe('POST /users/login', () => {
    it('returns a JWT token for valid credentials', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'alice@test.com', password: 'password123' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('token')
    })

    it('returns 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'alice@test.com', password: 'wrongpassword' })

      expect(res.status).toBe(401)
    })

    it('returns 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'nobody@test.com', password: 'password123' })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /users/:id', () => {
    it('returns user without password hash', async () => {
      const data = await setupTestData()
      const token = generateToken(data.alice.id)

      const res = await request(app)
        .get(`/users/${data.alice.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('name', 'Alice')
      expect(res.body).not.toHaveProperty('password')
    })

    it('returns 404 for non-existent user', async () => {
      const data = await setupTestData()
      const token = generateToken(data.alice.id)

      const res = await request(app)
        .get('/users/99999')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(404)
    })
  })
})
