import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../app'
import { createUser, authHeader, createBoard, createList, createCard } from '../test/helpers'

describe('GET /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('returns boards for the authenticated user', async () => {
    const user = await createUser({ email: 'boards-list@example.com' })
    await createBoard(user.id, 'My Board')
    const res = await request(app)
      .get('/boards')
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toMatchObject({ name: 'My Board' })
  })

  it('returns empty array when user has no boards', async () => {
    const user = await createUser({ email: 'boards-empty@example.com' })
    const res = await request(app)
      .get('/boards')
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /boards/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/boards/1')
    expect(res.status).toBe(401)
  })

  it('returns 403 if user is not a member', async () => {
    const owner = await createUser({ email: 'owner@example.com' })
    const other = await createUser({ email: 'other@example.com' })
    const board = await createBoard(owner.id)
    const res = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', authHeader(other.id))
    expect(res.status).toBe(403)
  })

  it('returns board with lists and cards', async () => {
    const user = await createUser({ email: 'boards-detail@example.com' })
    const board = await createBoard(user.id, 'Sprint Board')
    const list = await createList(board.id, 'Backlog')
    await createCard(list.id, 'Task 1')
    const res = await request(app)
      .get(`/boards/${board.id}`)
      .set('Authorization', authHeader(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ name: 'Sprint Board' })
    expect(res.body.lists).toHaveLength(1)
    expect(res.body.lists[0].cards).toHaveLength(1)
  })
})

describe('POST /boards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/boards').send({ name: 'Board' })
    expect(res.status).toBe(401)
  })

  it('creates a board and returns 201', async () => {
    const user = await createUser({ email: 'boards-create@example.com' })
    const res = await request(app)
      .post('/boards')
      .set('Authorization', authHeader(user.id))
      .send({ name: 'New Board' })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'New Board' })
  })
})

describe('POST /boards/:id/members', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/boards/1/members').send({ memberId: 1 })
    expect(res.status).toBe(401)
  })

  it('adds a member to the board', async () => {
    const owner = await createUser({ email: 'owner2@example.com' })
    const member = await createUser({ email: 'member@example.com' })
    const board = await createBoard(owner.id)
    const res = await request(app)
      .post(`/boards/${board.id}/members`)
      .set('Authorization', authHeader(owner.id))
      .send({ memberId: member.id })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
  })
})
