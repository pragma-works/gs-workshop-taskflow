import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import { setupTestData, generateToken, cleanupTestData, testDb } from './setup'

describe('Boards API', () => {
  let data: Awaited<ReturnType<typeof setupTestData>>
  let aliceToken: string
  let bobToken: string
  let carolToken: string

  beforeEach(async () => {
    data = await setupTestData()
    aliceToken = generateToken(data.alice.id)
    bobToken = generateToken(data.bob.id)
    carolToken = generateToken(data.carol.id)
  })

  afterAll(async () => {
    await cleanupTestData()
    await testDb.$disconnect()
  })

  describe('GET /boards', () => {
    it('returns boards for authenticated user', async () => {
      const res = await request(app)
        .get('/boards')
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(1)
      expect(res.body[0]).toHaveProperty('name', 'Test Board')
    })

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/boards')
      expect(res.status).toBe(401)
    })

    it('returns empty array for user with no boards', async () => {
      const res = await request(app)
        .get('/boards')
        .set('Authorization', `Bearer ${carolToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('GET /boards/:id', () => {
    it('returns board with lists and cards for member', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}`)
        .set('Authorization', `Bearer ${aliceToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('name', 'Test Board')
      expect(res.body).toHaveProperty('lists')
      expect(Array.isArray(res.body.lists)).toBe(true)
    })

    it('returns 403 for non-member', async () => {
      const res = await request(app)
        .get(`/boards/${data.board.id}`)
        .set('Authorization', `Bearer ${carolToken}`)

      expect(res.status).toBe(403)
    })
  })

  describe('POST /boards', () => {
    it('creates a new board', async () => {
      const res = await request(app)
        .post('/boards')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ name: 'New Board' })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('name', 'New Board')
    })
  })

  describe('POST /boards/:id/members', () => {
    it('allows owner to add a member', async () => {
      const res = await request(app)
        .post(`/boards/${data.board.id}/members`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ memberId: data.carol.id })

      expect(res.status).toBe(201)
      expect(res.body).toEqual({ ok: true })
    })

    it('returns 403 when non-owner tries to add member', async () => {
      const res = await request(app)
        .post(`/boards/${data.board.id}/members`)
        .set('Authorization', `Bearer ${bobToken}`)
        .send({ memberId: data.carol.id })

      expect(res.status).toBe(403)
    })
  })
})
