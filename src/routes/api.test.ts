import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import app from '../index'

const prisma = new PrismaClient()

function makeToken(userId: number) {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

describe('Users', () => {
  beforeEach(async () => {
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.activityEvent.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(() => prisma.$disconnect())

  it('registers a new user without exposing the password', async () => {
    const res = await request(app).post('/users/register').send({
      email: 'test@example.com',
      password: 'secret',
      name: 'Alice',
    })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('test@example.com')
    expect(res.body.password).toBeUndefined()
  })

  it('returns a JWT token on successful login', async () => {
    await request(app).post('/users/register').send({ email: 'bob@test.com', password: 'pass', name: 'Bob' })
    const res = await request(app).post('/users/login').send({ email: 'bob@test.com', password: 'pass' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('returns 401 when login credentials are invalid', async () => {
    const res = await request(app).post('/users/login').send({ email: 'nobody@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns user data without password field on GET /users/:id', async () => {
    const reg = await request(app).post('/users/register').send({ email: 'carol@test.com', password: 'x', name: 'Carol' })
    const res = await request(app).get(`/users/${reg.body.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Carol')
    expect(res.body.password).toBeUndefined()
  })

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/users/99999')
    expect(res.status).toBe(404)
  })
})

describe('Boards', () => {
  let userId: number
  let token: string
  let boardId: number

  beforeEach(async () => {
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.activityEvent.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({ data: { email: `u${Date.now()}@t.com`, password: 'x', name: 'T' } })
    userId = user.id
    token = makeToken(userId)
    const board = await prisma.board.create({ data: { name: 'B1' } })
    boardId = board.id
    await prisma.boardMember.create({ data: { userId, boardId, role: 'owner' } })
    await prisma.list.create({ data: { name: 'Backlog', position: 0, boardId } })
  })

  afterAll(() => prisma.$disconnect())

  it('returns 401 when listing boards without auth', async () => {
    const res = await request(app).get('/boards')
    expect(res.status).toBe(401)
  })

  it('lists boards for authenticated user', async () => {
    const res = await request(app).get('/boards').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns full board details with lists and cards', async () => {
    const res = await request(app).get(`/boards/${boardId}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.lists).toHaveLength(1)
  })

  it('returns 403 when non-member tries to view a board', async () => {
    const other = await prisma.user.create({ data: { email: `x${Date.now()}@t.com`, password: 'y', name: 'X' } })
    const otherToken = makeToken(other.id)
    const res = await request(app).get(`/boards/${boardId}`).set('Authorization', `Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })

  it('creates a board and makes the caller the owner', async () => {
    const res = await request(app).post('/boards').set('Authorization', `Bearer ${token}`).send({ name: 'New Board' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('New Board')
  })
})

describe('Cards', () => {
  let userId: number
  let token: string
  let listId: number

  beforeEach(async () => {
    await prisma.comment.deleteMany()
    await prisma.cardLabel.deleteMany()
    await prisma.activityEvent.deleteMany()
    await prisma.card.deleteMany()
    await prisma.list.deleteMany()
    await prisma.boardMember.deleteMany()
    await prisma.board.deleteMany()
    await prisma.user.deleteMany()

    const user = await prisma.user.create({ data: { email: `u${Date.now()}@t.com`, password: 'x', name: 'T' } })
    userId = user.id
    token = makeToken(userId)
    const board = await prisma.board.create({ data: { name: 'B' } })
    await prisma.boardMember.create({ data: { userId, boardId: board.id, role: 'owner' } })
    const list = await prisma.list.create({ data: { name: 'Todo', position: 0, boardId: board.id } })
    listId = list.id
  })

  afterAll(() => prisma.$disconnect())

  it('creates a card in a list', async () => {
    const res = await request(app)
      .post('/cards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Task', listId })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('My Task')
  })

  it('returns 401 when fetching a card without auth', async () => {
    const card = await prisma.card.create({ data: { title: 'T', position: 0, listId } })
    const res = await request(app).get(`/cards/${card.id}`)
    expect(res.status).toBe(401)
  })

  it('adds a comment to a card', async () => {
    const card = await prisma.card.create({ data: { title: 'T', position: 0, listId } })
    const res = await request(app)
      .post(`/cards/${card.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Good work' })
    expect(res.status).toBe(201)
    expect(res.body.content).toBe('Good work')
  })

  it('deletes a card', async () => {
    const card = await prisma.card.create({ data: { title: 'T', position: 0, listId } })
    const res = await request(app)
      .delete(`/cards/${card.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
