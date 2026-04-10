import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'
import { signToken } from '../middleware/auth'

const aliceToken = signToken(1) // alice - board member (owner)
const bobToken = signToken(2)   // bob - board member
const uniqueId = Date.now()

// ── Activity Feed ────────────────────────────────────────────

describe('GET /boards/:id/activity', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1/activity')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
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
    expect(res.body).toHaveProperty('error', 'Not a board member')
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app)
      .get('/boards/999/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Board not found')
  })

  it('returns events array for board member', async () => {
    const res = await request(app)
      .get('/boards/1/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('events')
    expect(Array.isArray(res.body.events)).toBe(true)
  })

  it('returns 500 for invalid board id', async () => {
    const res = await request(app)
      .get('/boards/abc/activity')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
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
    expect(res.body).toHaveProperty('error', 'Board not found')
  })

  it('returns at most 10 events', async () => {
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    expect(res.body.events.length).toBeLessThanOrEqual(10)
  })

  it('returns 500 for invalid board id', async () => {
    const res = await request(app).get('/boards/abc/activity/preview')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })

  it('returns events for correct board only', async () => {
    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.status).toBe(200)
    for (const event of res.body.events) {
      expect(event.boardId).toBe(1)
    }
  })

  it('returns events in newest-first order', async () => {
    // Move two cards to generate events with known order
    await request(app)
      .patch('/cards/4/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 1, position: 0 })
    await request(app)
      .patch('/cards/4/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    const res = await request(app).get('/boards/1/activity/preview')
    const events = res.body.events
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i - 1].createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(events[i].createdAt).getTime())
    }
  })
})

// ── Card Move ────────────────────────────────────────────────

describe('PATCH /cards/:id/move', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/cards/3/move')
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('creates activity event with correct data when card is moved', async () => {
    const beforeRes = await request(app).get('/boards/1/activity/preview')
    const beforeCount = beforeRes.body.events.length

    await request(app)
      .patch('/cards/3/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })

    const res = await request(app).get('/boards/1/activity/preview')
    expect(res.body.events.length).toBeGreaterThan(beforeCount)

    const latest = res.body.events[0]
    expect(latest.action).toBe('card_moved')
    expect(latest.cardId).toBe(3)
    expect(latest.boardId).toBe(1)
    expect(latest.userId).toBe(1)
    expect(latest.meta).toBeDefined()
    const meta = JSON.parse(latest.meta)
    expect(meta).toHaveProperty('fromListId')
    expect(meta).toHaveProperty('toListId', 2)
  })

  it('actually updates the card list', async () => {
    await request(app)
      .patch('/cards/2/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 3, position: 0 })

    const cardRes = await request(app)
      .get('/cards/2')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(cardRes.body.listId).toBe(3)
  })

  it('returns ok true', async () => {
    const res = await request(app)
      .patch('/cards/1/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 1, position: 0 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .patch('/cards/999/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns 500 for invalid card id', async () => {
    const res = await request(app)
      .patch('/cards/abc/move')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ targetListId: 2, position: 0 })
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

// ── Comments ─────────────────────────────────────────────────

describe('POST /cards/:id/comments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/cards/1/comments')
      .send({ content: 'no auth' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('creates activity event with action comment_added', async () => {
    const beforeRes = await request(app).get('/boards/1/activity/preview')
    const beforeCount = beforeRes.body.events.filter(
      (e: any) => e.action === 'comment_added'
    ).length

    await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Activity test comment' })

    const res = await request(app).get('/boards/1/activity/preview')
    const commentEvents = res.body.events.filter(
      (e: any) => e.action === 'comment_added'
    )
    expect(commentEvents.length).toBeGreaterThan(beforeCount)
    expect(commentEvents[0].cardId).toBe(1)
    expect(commentEvents[0].userId).toBe(1)
    expect(commentEvents[0].action).toBe('comment_added')
  })

  it('returns comment object with 201', async () => {
    const res = await request(app)
      .post('/cards/1/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Another comment' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('content', 'Another comment')
    expect(res.body).toHaveProperty('cardId', 1)
    expect(res.body).toHaveProperty('userId', 1)
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .post('/cards/999/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'no card' })
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns 500 for invalid card id', async () => {
    const res = await request(app)
      .post('/cards/abc/comments')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'bad id' })
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

// ── Boards ───���───────────────────────────────────────────────

describe('GET /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('returns only boards user is member of', async () => {
    const res = await request(app)
      .get('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('name')
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 404 for non-existent board', async () => {
    const res = await request(app)
      .get('/boards/999')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('returns 403 for non-member', async () => {
    const token = signToken(999)
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  it('returns board with nested lists, cards, comments, labels', async () => {
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('lists')
    expect(Array.isArray(res.body.lists)).toBe(true)
    expect(res.body.lists.length).toBeGreaterThanOrEqual(1)

    const list = res.body.lists[0]
    expect(list).toHaveProperty('cards')
    expect(Array.isArray(list.cards)).toBe(true)

    if (list.cards.length > 0) {
      expect(list.cards[0]).toHaveProperty('comments')
      expect(list.cards[0]).toHaveProperty('labels')
    }
  })

  it('returns lists ordered by position', async () => {
    const res = await request(app)
      .get('/boards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    const positions = res.body.lists.map((l: any) => l.position)
    expect(positions).toEqual([...positions].sort((a: number, b: number) => a - b))
  })

  it('returns 500 for invalid board id', async () => {
    const res = await request(app)
      .get('/boards/abc')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

describe('POST /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/boards')
      .send({ name: 'New Board' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('creates a new board and user is owner', async () => {
    const res = await request(app)
      .post('/boards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Test Board' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('name', 'Test Board')

    // Verify alice can access it (is a member)
    const boardRes = await request(app)
      .get(`/boards/${res.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(boardRes.status).toBe(200)
  })
})

describe('POST /boards/:id/members', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/boards/1/members')
      .send({ memberId: 3 })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('adds a member who can then access the board', async () => {
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

    // Verify bob can now access the board
    const accessRes = await request(app)
      .get(`/boards/${boardId}`)
      .set('Authorization', `Bearer ${bobToken}`)
    expect(accessRes.status).toBe(200)
  })
})

// ── Cards ────────────────────────────────────────────────────

describe('GET /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/cards/1')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 404 for non-existent card', async () => {
    const res = await request(app)
      .get('/cards/999')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns card with comments and labels', async () => {
    const res = await request(app)
      .get('/cards/1')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('title')
    expect(res.body).toHaveProperty('comments')
    expect(res.body).toHaveProperty('labels')
    expect(Array.isArray(res.body.comments)).toBe(true)
    expect(Array.isArray(res.body.labels)).toBe(true)
  })

  it('returns 500 for invalid card id', async () => {
    const res = await request(app)
      .get('/cards/abc')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

describe('POST /cards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/cards')
      .send({ title: 'No Auth Card', listId: 1 })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('creates a new card with correct position', async () => {
    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'New Test Card', listId: 1 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('title', 'New Test Card')
    expect(res.body).toHaveProperty('listId', 1)
    expect(res.body).toHaveProperty('position')
    expect(typeof res.body.position).toBe('number')
  })
})

describe('DELETE /cards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/cards/5')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Unauthorized')
  })

  it('deletes a card and returns ok true', async () => {
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

    // Verify it's actually deleted
    const getRes = await request(app)
      .get(`/cards/${cardId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(getRes.status).toBe(404)
  })

  it('returns error for non-existent card', async () => {
    const res = await request(app)
      .delete('/cards/999')
      .set('Authorization', `Bearer ${aliceToken}`)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body).toHaveProperty('error')
  })
})

// ── Users ────────────────────────────────────────────────────

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
    expect(typeof res.body.token).toBe('string')
    expect(res.body.token.length).toBeGreaterThan(0)
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Invalid credentials')
  })

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@test.com', password: 'pass' })
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error', 'Invalid credentials')
  })

  it('returns 500 for missing body fields', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({})
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

describe('GET /users/:id', () => {
  it('returns user without password', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('email')
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/users/999')
    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Not found')
  })

  it('returns 500 for invalid user id', async () => {
    const res = await request(app).get('/users/abc')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
