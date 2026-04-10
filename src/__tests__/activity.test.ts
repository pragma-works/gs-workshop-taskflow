import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import { signToken } from '../middleware/auth'

const aliceToken = signToken(1) // alice - board member
const bobToken = signToken(2)   // bob - board member
const uniqueId = Date.now()

describe('GET /boards/:id/activity', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-member', async () => {
    const email = `outsider-${uniqueId}@test.com`
    await request(app)
      .post('/users/register')
      .send({ email, password: 'pass123', name: 'Outsider' })
    const loginRes = await request(app)
      .post('/users/login')
      .send({ email, password: 'pass123' })
    const outsiderToken = loginRes.body.token

    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${outsiderToken}`)
    expect(res.status).toBe(403)
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

describe('PATCH /cards/:id/move', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/cards/3/move')
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
  })

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

describe('POST /cards/:id/comments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/cards/1/comments')
      .send({ content: 'no auth' })
    expect(res.status).toBe(401)
  })

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

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .post('/cards/999/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'no card' })
    expect(res.status).toBe(404)
  })
})

describe('GET /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns boards for user', async () => {
    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-member', async () => {
    const token = signToken(999)
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('returns board with details', async () => {
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('lists')
  })
})

describe('POST /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/boards')
      .send({ name: 'New Board' })
    expect(res.status).toBe(401)
  })

  it('creates a new board', async () => {
    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Test Board' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('name', 'Test Board')
  })
})

describe('POST /boards/:id/members', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/boards/1/members')
      .send({ memberId: 3 })
    expect(res.status).toBe(401)
  })

  it('adds a member to the board', async () => {
    // First create a new board
    const boardRes = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Member Test Board' })
    const boardId = boardRes.body.id

    const res = await request(app)
      .post(`/boards/${boardId}/members`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ memberId: 2 })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('GET /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .get('/cards/999')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(404)
  })

  it('returns card with details', async () => {
    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('title')
    expect(res.body).toHaveProperty('comments')
    expect(res.body).toHaveProperty('labels')
  })
})

describe('POST /cards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/cards')
      .send({ title: 'No Auth Card', listId: 1 })
    expect(res.status).toBe(401)
  })

  it('creates a new card', async () => {
    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'New Test Card', listId: 1 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('title', 'New Test Card')
    expect(res.body).toHaveProperty('listId', 1)
  })
})

describe('DELETE /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/cards/5')
    expect(res.status).toBe(401)
  })

  it('deletes a card', async () => {
    // Create a card first so we can delete it
    const createRes = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Card To Delete', listId: 1 })
    const cardId = createRes.body.id

    const res = await request(app)
      .delete(`/cards/${cardId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns error for non-existent card', async () => {
    const res = await request(app)
      .delete('/cards/999')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /users/register', () => {
  it('registers a new user without password in response', async () => {
    const email = `newuser-${uniqueId}@test.com`
    const res = await request(app)
      .post('/users/register')
      .send({ email, password: 'pass123', name: 'New User' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name', 'New User')
    expect(res.body).toHaveProperty('email', email)
    expect(res.body).not.toHaveProperty('password')
  })
})

describe('POST /users/login', () => {
  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@test.com', password: 'pass' })
    expect(res.status).toBe(401)
  })
})

describe('GET /users/:id', () => {
  it('returns user without password', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name')
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/users/999')
    expect(res.status).toBe(404)
  })
})
