import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const prismaMock = vi.hoisted(() => ({
  user: {
    create:     vi.fn(),
    findUnique: vi.fn(),
  },
}))

// bcryptjs is imported as `import * as bcrypt` in users.ts, so the mock
// must expose named exports (not a default). vi.hoisted ensures the fns
// are available when the factory runs.
const bcryptMock = vi.hoisted(() => ({
  hash:    vi.fn(),
  compare: vi.fn(),
}))

vi.mock('../db',    () => ({ default: prismaMock }))
vi.mock('bcryptjs', () => bcryptMock)

import usersRouter from './users'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/users', usersRouter)
  return app
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Users routes', () => {
  const app = buildApp()

  beforeEach(() => {
    vi.resetAllMocks()
    bcryptMock.hash.mockResolvedValue('$hashed$')
  })

  // ── POST /users/register ─────────────────────────────────────────────────

  it('creates a new user and returns the record on POST /users/register', async () => {
    const created = { id: 1, email: 'bob@test.com', name: 'Bob', password: '$hashed$', createdAt: new Date().toISOString() }
    prismaMock.user.create.mockResolvedValue(created)

    const res = await request(app)
      .post('/users/register')
      .send({ email: 'bob@test.com', password: 'secret', name: 'Bob' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, email: 'bob@test.com' })
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: 'bob@test.com', password: '$hashed$', name: 'Bob' },
    })
  })

  it('hashes the password before storing it on POST /users/register', async () => {
    prismaMock.user.create.mockResolvedValue({ id: 1, email: 'a@b.com', name: 'A', password: '$hashed$', createdAt: new Date() })

    await request(app)
      .post('/users/register')
      .send({ email: 'a@b.com', password: 'plaintext', name: 'A' })

    expect(bcryptMock.hash).toHaveBeenCalledWith('plaintext', 10)
  })

  // ── POST /users/login ────────────────────────────────────────────────────

  it('returns a JWT token for valid credentials on POST /users/login', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 2, email: 'alice@test.com', password: '$hashed$', name: 'Alice', createdAt: new Date() })
    bcryptMock.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(typeof res.body.token).toBe('string')
  })

  it('returns 401 when the user does not exist on POST /users/login', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'ghost@test.com', password: 'any' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Invalid credentials' })
  })

  it('returns 401 when the password is wrong on POST /users/login', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 1, email: 'alice@test.com', password: '$hashed$', name: 'Alice', createdAt: new Date() })
    bcryptMock.compare.mockResolvedValue(false)

    const res = await request(app)
      .post('/users/login')
      .send({ email: 'alice@test.com', password: 'wrongpass' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Invalid credentials' })
  })

  // ── GET /users/:id ───────────────────────────────────────────────────────

  it('returns the user record for GET /users/:id when the user exists', async () => {
    const user = { id: 3, email: 'carol@test.com', name: 'Carol', password: '$hashed$', createdAt: new Date().toISOString() }
    prismaMock.user.findUnique.mockResolvedValue(user)

    const res = await request(app).get('/users/3')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 3, email: 'carol@test.com' })
  })

  it('returns 404 for GET /users/:id when the user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/users/999')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })
})
