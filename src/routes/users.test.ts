import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../db', () => ({
  default: {
    user: { create: vi.fn(), findUnique: vi.fn() },
  },
}))

vi.mock('bcryptjs', () => ({
  hash:    vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}))

import prisma from '../db'
import * as bcrypt from 'bcryptjs'
import usersRouter from './users'

const app = express()
app.use(express.json())
app.use('/users', usersRouter)

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------

describe('POST /users/register', () => {
  it('creates a new user and returns the user object', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(
      { id: 1, email: 'alice@test.com', name: 'Alice', password: 'hashed_password', createdAt: new Date() } as any,
    )

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'alice@test.com', password: 'password123', name: 'Alice' })

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@test.com')
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('password123', 10)
  })
})

// ---------------------------------------------------------------------------

describe('POST /users/login', () => {
  it('returns a JWT token when credentials are valid', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 1, email: 'alice@test.com', password: 'hashed_password', name: 'Alice', createdAt: new Date() } as any,
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('returns 401 when the user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'nobody@test.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
  })

  it('returns 401 when the password is incorrect', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 1, email: 'alice@test.com', password: 'hashed_password', name: 'Alice', createdAt: new Date() } as any,
    )
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrongpass' })

    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------

describe('GET /users/:id', () => {
  it('returns the user when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 1, email: 'alice@test.com', name: 'Alice', password: 'hashed', createdAt: new Date() } as any,
    )

    const res = await request(app).get('/users/1')

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Alice')
  })

  it('returns 404 when the user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app).get('/users/99')

    expect(res.status).toBe(404)
  })
})
