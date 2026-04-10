import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createUsersRouter } from './users'
import type { AuthService } from '../services/AuthService'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = 'super-secret-key-change-me'

function token(userId: number) {
  return `Bearer ${jwt.sign({ userId }, JWT_SECRET)}`
}

function makeMockAuthService(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    getUser: vi.fn(),
  } as unknown as AuthService
}

function makeApp(authService: AuthService) {
  const app = express()
  app.use(express.json())
  app.use('/users', createUsersRouter(authService))
  return app
}

// ---------------------------------------------------------------------------

describe('POST /users/register', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = makeMockAuthService()
  })

  it('returns 201 with user (no password) on success', async () => {
    const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', createdAt: new Date() }
    vi.mocked(authService.register).mockResolvedValueOnce(mockUser as any)

    const res = await request(makeApp(authService))
      .post('/users/register')
      .send({ email: 'alice@example.com', password: 'secret', name: 'Alice' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ email: 'alice@example.com', name: 'Alice' })
    expect(res.body.password).toBeUndefined()
  })

  it('returns 400 when registration fails', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce(new Error('Email already in use'))

    const res = await request(makeApp(authService))
      .post('/users/register')
      .send({ email: 'dup@example.com', password: 'pass', name: 'Dup' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: 'Email already in use' })
  })
})

// ---------------------------------------------------------------------------

describe('POST /users/login', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = makeMockAuthService()
  })

  it('returns 200 with token on successful login', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce('signed.jwt.token')

    const res = await request(makeApp(authService))
      .post('/users/login')
      .send({ email: 'alice@example.com', password: 'secret' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ token: 'signed.jwt.token' })
  })

  it('returns 401 when credentials are invalid', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Invalid credentials'))

    const res = await request(makeApp(authService))
      .post('/users/login')
      .send({ email: 'alice@example.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ error: 'Invalid credentials' })
  })
})

// ---------------------------------------------------------------------------

describe('GET /users/:id', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = makeMockAuthService()
  })

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(makeApp(authService)).get('/users/1')
    expect(res.status).toBe(401)
  })

  it('returns 200 with user when found', async () => {
    const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', createdAt: new Date() }
    vi.mocked(authService.getUser).mockResolvedValueOnce(mockUser as any)

    const res = await request(makeApp(authService))
      .get('/users/1')
      .set('Authorization', token(1))

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 1, email: 'alice@example.com' })
  })

  it('returns 404 when user not found', async () => {
    vi.mocked(authService.getUser).mockResolvedValueOnce(null)

    const res = await request(makeApp(authService))
      .get('/users/999')
      .set('Authorization', token(1))

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: 'Not found' })
  })
})
