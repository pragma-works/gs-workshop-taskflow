import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import { signToken } from '../middleware/auth'

const aliceToken = signToken(1)

describe('GET /boards/:id/activity', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app)
      .get('/boards/999/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(404)
  })

  it('returns events array for board member', async () => {
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
  })
})

describe('GET /boards/:id/activity/preview', () => {
  it('returns events without auth', async () => {
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app).get('/boards/999/activity/preview')
    expect(res.status).toBe(404)
  })

  it('returns at most 10 events', async () => {
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body.events.length).toBeLessThanOrEqual(10)
  })
})

describe('PATCH /cards/:id/move — activity integration', () => {
  it('creates activity event when card is moved', async () => {
    await request(app)
      .patch('/cards/3/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    const res = await request(app).get('/boards/1/activity/preview')
    const moveEvents = res.body.events.filter(
      (e: any) => e.action === 'card_moved' && e.cardId === 3
    )
    expect(moveEvents.length).toBeGreaterThanOrEqual(1)
    expect(moveEvents[0]).toHaveProperty('boardId', 1)
    expect(moveEvents[0]).toHaveProperty('userId', 1)
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .patch('/cards/999/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(404)
  })
})

describe('POST /cards/:id/comments — activity integration', () => {
  it('creates activity event when comment is added', async () => {
    await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Test comment for activity' })

    const res = await request(app).get('/boards/1/activity/preview')
    const commentEvents = res.body.events.filter(
      (e: any) => e.action === 'comment_added' && e.cardId === 1
    )
    expect(commentEvents.length).toBeGreaterThanOrEqual(1)
  })

  it('returns comment object with 201', async () => {
    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Another comment' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('content', 'Another comment')
  })
})

describe('Existing endpoints', () => {
  it('GET /boards returns boards for user', async () => {
    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /boards/:id returns board with details', async () => {
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('lists')
  })

  it('POST /users/login returns token', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('POST /users/login returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('GET /users/:id returns user without password', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('password')
  })

  it('GET /cards/:id returns card with details', async () => {
    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('title')
  })
})
