import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import * as jwt from 'jsonwebtoken'

vi.mock('../db', () => ({
  default: {
    user: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

vi.mock('bcryptjs', () => ({
  hash:    vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn(),
}))

import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import usersRouter from './users'

// ── helpers ────────────────────────────────────────────────────────────────────

const TOKEN_SECRET = 'super-secret-key-change-me'
const MOCK_USER = {
  id: 1, email: 'alice@example.com', password: '$2b$10$hashedpassword',
  name: 'Alice', createdAt: new Date(),
}

const app = express()
app.use(express.json())
app.use('/users', usersRouter)

beforeEach(() => vi.clearAllMocks())

// ── POST /users/register ───────────────────────────────────────────────────────

describe('POST /users/register', () => {
  it('creates a user and returns the record', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER)

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'alice@example.com', password: 'secret', name: 'Alice' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, email: 'alice@example.com', name: 'Alice' })
  })

  it('hashes the password before storing it', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER)

    await request(app)
      .post('/users/register')
      .send({ email: 'alice@example.com', password: 'plaintext', name: 'Alice' })

    expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10)
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: '$2b$10$hashedpassword' }),
      })
    )
  })
})

// ── POST /users/login ──────────────────────────────────────────────────────────

describe('POST /users/login', () => {
  it('returns a JWT token when credentials are valid', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@example.com', password: 'secret' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')

    const payload = jwt.verify(res.body.token, TOKEN_SECRET) as { userId: number }
    expect(payload.userId).toBe(1)
  })

  it('returns 401 when the email does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@example.com', password: 'secret' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Invalid credentials' })
  })

  it('returns 401 when the password does not match', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@example.com', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Invalid credentials' })
  })
})

// ── GET /users/:id ─────────────────────────────────────────────────────────────

describe('GET /users/:id', () => {
  it('returns the user record when the id exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER)

    const res = await request(app).get('/users/1')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, name: 'Alice' })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('returns 404 when no user exists with that id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app).get('/users/999')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })
})
