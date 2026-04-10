process.env.JWT_SECRET = 'test-secret'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../services/userService', () => ({
  createUser:      vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById:    vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  hash:    vi.fn(),
  compare: vi.fn(),
}))

import app from '../index'
import * as bcrypt from 'bcryptjs'
import { createUser, findUserByEmail, findUserById } from '../services/userService'

function makeToken(userId: number): string {
  return jwt.sign({ userId }, 'test-secret')
}

beforeEach(() => vi.clearAllMocks())

describe('POST /users/register', () => {
  it('returns 201 with user object (no password field)', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed' as never)
    vi.mocked(createUser).mockResolvedValueOnce(
      { id: 1, email: 'a@b.com', name: 'Alice', createdAt: new Date('2024-01-01') } as any,
    )

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'a@b.com', password: 'secret', name: 'Alice' })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('a@b.com')
    expect(res.body.name).toBe('Alice')
    expect(res.body.password).toBeUndefined()
  })

  it('calls createUser with hashed password, not plaintext', async () => {
    vi.mocked(bcrypt.hash).mockResolvedValueOnce('hashed_pw' as never)
    vi.mocked(createUser).mockResolvedValueOnce({ id: 2, email: 'x@y.com', name: 'Bob', createdAt: new Date() } as any)

    await request(app)
      .post('/users/register')
      .send({ email: 'x@y.com', password: 'plain', name: 'Bob' })

    expect(createUser).toHaveBeenCalledWith('x@y.com', 'hashed_pw', 'Bob')
  })
})

describe('POST /users/login', () => {
  it('returns 401 when user is not found', async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(null)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'no@one.com', password: 'pw' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('returns 401 when password is incorrect', async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      { id: 1, email: 'a@b.com', password: 'hashed', name: 'Alice', createdAt: new Date() } as any,
    )
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'a@b.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('returns 200 with a JWT token when credentials are valid', async () => {
    vi.mocked(findUserByEmail).mockResolvedValueOnce(
      { id: 1, email: 'a@b.com', password: 'hashed', name: 'Alice', createdAt: new Date() } as any,
    )
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'a@b.com', password: 'secret' })

    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
    const payload = jwt.verify(res.body.token, 'test-secret') as { userId: number }
    expect(payload.userId).toBe(1)
  })
})

describe('GET /users/:id', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when user is not found', async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/users/99')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('returns 200 with user data when found', async () => {
    vi.mocked(findUserById).mockResolvedValueOnce(
      { id: 5, email: 'u@v.com', name: 'Carol', createdAt: new Date('2024-06-01') } as any,
    )

    const res = await request(app)
      .get('/users/5')
      .set('Authorization', `Bearer ${makeToken(1)}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(5)
    expect(res.body.name).toBe('Carol')
    expect(res.body.password).toBeUndefined()
  })
})
