/**
 * Tests for users endpoints.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../index'
import prisma from '../db'

beforeAll(async () => {
  await prisma.activityEvent.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.cardLabel.deleteMany()
  await prisma.card.deleteMany()
  await prisma.list.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()
})

describe('POST /users/register', () => {
  it('registers a new user without returning password', async () => {
    const res = await request(app)
      .post('/users/register')
      .send({ email: 'newuser@test.com', password: 'secret', name: 'New User' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('email', 'newuser@test.com')
    expect(res.body).not.toHaveProperty('password')
  })
})

describe('POST /users/login', () => {
  it('returns a token for valid credentials', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'newuser@test.com', password: 'secret' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
  })

  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'newuser@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
  })
})

describe('GET /users/:id', () => {
  it('returns user without password field', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'newuser@test.com' } })
    const res = await request(app).get(`/users/${user!.id}`)
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/users/99999')
    expect(res.status).toBe(404)
  })
})
