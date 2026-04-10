import { describe, it, expect } from 'vitest'
import { verifyToken, signToken } from './auth'
import * as jwt from 'jsonwebtoken'

describe('auth middleware', () => {
  it('signToken returns a JWT', () => {
    const token = signToken(123)
    expect(typeof token).toBe('string')
    const payload = jwt.decode(token) as any
    expect(payload.userId).toBe(123)
  })

  it('verifyToken throws if no header', () => {
    expect(() => verifyToken({ headers: {} } as any)).toThrow('No auth header')
  })
})
