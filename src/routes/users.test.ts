import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    user: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

vi.mock('bcryptjs', () => ({
  hash:    vi.fn().mockResolvedValue('$2a$10$hashed'),
  compare: vi.fn(),
}))

import app from '../index'
import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import { JWT_SECRET } from '../lib/auth'

const db = prisma as any
const bearerToken = (userId: number) => `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`

const dbUser = {
  id: 1, email: 'alice@test.com', name: 'Alice',
  password: '$2a$10$hashed', createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

// ── POST /users/register ──────────────────────────────────────────────────

describe('POST /users/register', () => {
  it('returns the new user without the password field', async () => {
    db.user.create.mockResolvedValue(dbUser)
    const res = await request(app)
      .post('/users/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@test.com')
    expect(res.body.name).toBe('Alice')
    expect(res.body).not.toHaveProperty('password')
  })

  it('stores a bcrypt hash, not the plain-text password', async () => {
    db.user.create.mockResolvedValue(dbUser)
    await request(app)
      .post('/users/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' })
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('password123', 12)
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: '$2a$10$hashed' }),
      })
    )
  })
})

// ── POST /users/login ─────────────────────────────────────────────────────

describe('POST /users/login', () => {
  it('returns a signed JWT for valid credentials', async () => {
    db.user.findUnique.mockResolvedValue(dbUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as { userId: number }
    expect(decoded.userId).toBe(1)
  })

  it('returns 401 when the user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@test.com', password: 'password123' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('returns 401 when the password is incorrect', async () => {
    db.user.findUnique.mockResolvedValue(dbUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('does not expose whether a non-existent email vs wrong password caused the failure', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const resNoUser = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@test.com', password: 'x' })
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    db.user.findUnique.mockResolvedValue(dbUser)
    const resWrongPw = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'x' })
    expect(resNoUser.body.error).toBe(resWrongPw.body.error)
  })
})

// ── Targeted: kill error-body, where-clause, and token survivors ─────────

describe('POST /users/login — query and token precision', () => {
  it('looks up the user by exact email in the where clause', async () => {
    db.user.findUnique.mockResolvedValue(null)
    await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'pw' })
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'alice@test.com' },
    })
  })

  it('issues a token that carries an expiry (expiresIn is set)', async () => {
    db.user.findUnique.mockResolvedValue(dbUser)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'pw' })
    const decoded = jwt.verify(res.body.token, JWT_SECRET) as { userId: number; exp: number }
    expect(decoded.exp).toBeDefined()
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})

describe('GET /users/:id — response body and query precision', () => {
  it('returns { error: "Unauthorized" } as the body on 401', async () => {
    const res = await request(app).get('/users/1')
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('looks up the user by exact id in the where clause', async () => {
    db.user.findUnique.mockResolvedValue(dbUser)
    // callerId must match id to pass the 403 self-only guard
    await request(app).get('/users/1').set('Authorization', bearerToken(1))
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})

describe('GET /users/:id', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/users/1')
    expect(res.status).toBe(401)
  })

  it('returns the user without the password field', async () => {
    db.user.findUnique.mockResolvedValue(dbUser)
    const res = await request(app)
      .get('/users/1')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
    expect(res.body.email).toBe('alice@test.com')
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 403 when requesting another user\'s profile', async () => {
    const res = await request(app)
      .get('/users/999')
      .set('Authorization', bearerToken(1))
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'Forbidden' })
  })

  it('returns 404 when the user does not exist (own profile)', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .get('/users/999')
      .set('Authorization', bearerToken(999))
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })
})
