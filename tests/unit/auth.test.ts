import { describe, it, expect } from 'vitest'
import type { Request } from 'express'
import * as jwt from 'jsonwebtoken'

import { verifyToken } from '../../src/shared/middleware/auth'

function makeRequest(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request
}

describe('verifyToken', () => {
  const SECRET = 'test-secret'

  it('returns userId from a valid token', () => {
    const token = jwt.sign({ userId: 42 }, SECRET)
    const req = makeRequest(`Bearer ${token}`)
    expect(verifyToken(req)).toBe(42)
  })

  it('throws when Authorization header is missing', () => {
    const req = makeRequest(undefined)
    expect(() => verifyToken(req)).toThrow('No auth header')
  })

  it('throws when the token is signed with the wrong secret', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong-secret')
    const req = makeRequest(`Bearer ${token}`)
    expect(() => verifyToken(req)).toThrow()
  })

  it('throws when the token is expired', () => {
    const token = jwt.sign({ userId: 1 }, SECRET, { expiresIn: -1 })
    const req = makeRequest(`Bearer ${token}`)
    expect(() => verifyToken(req)).toThrow()
  })
})
