process.env.JWT_SECRET = 'test-secret'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as jwt from 'jsonwebtoken'
import { verifyToken, requireAuth } from './auth'
import type { Request, Response, NextFunction } from 'express'

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request
}

function makeRes(): { locals: Record<string, unknown>; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret'
})

describe('verifyToken', () => {
  it('throws when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET
    const req = makeReq({ headers: { authorization: 'Bearer sometoken' } })
    expect(() => verifyToken(req)).toThrow('JWT_SECRET is not configured')
  })

  it('throws when Authorization header is missing', () => {
    const req = makeReq({ headers: {} })
    expect(() => verifyToken(req)).toThrow('No auth header')
  })

  it('throws when token is invalid', () => {
    const req = makeReq({ headers: { authorization: 'Bearer invalid.token.here' } })
    expect(() => verifyToken(req)).toThrow()
  })

  it('throws when token is signed with wrong secret', () => {
    const token = jwt.sign({ userId: 42 }, 'wrong-secret')
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } })
    expect(() => verifyToken(req)).toThrow()
  })

  it('returns userId from a valid token', () => {
    const token = jwt.sign({ userId: 42 }, 'test-secret')
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } })
    const userId = verifyToken(req)
    expect(userId).toBe(42)
  })
})

describe('requireAuth', () => {
  it('sets res.locals.userId and calls next() for a valid token', () => {
    const token = jwt.sign({ userId: 7 }, 'test-secret')
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } })
    const res = makeRes()
    const next = vi.fn() as NextFunction

    requireAuth(req, res as unknown as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.locals.userId).toBe(7)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 and does NOT call next() when Authorization header is missing', () => {
    const req = makeReq({ headers: {} })
    const res = makeRes()
    const next = vi.fn() as NextFunction

    requireAuth(req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 and does NOT call next() when token is invalid', () => {
    const req = makeReq({ headers: { authorization: 'Bearer bad.token' } })
    const res = makeRes()
    const next = vi.fn() as NextFunction

    requireAuth(req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET
    const token = jwt.sign({ userId: 5 }, 'test-secret')
    const req = makeReq({ headers: { authorization: `Bearer ${token}` } })
    const res = makeRes()
    const next = vi.fn() as NextFunction

    requireAuth(req, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })
})
