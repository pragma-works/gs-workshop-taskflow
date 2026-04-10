process.env.DATABASE_URL = `file:./dev-${Date.now()}-${Math.floor(Math.random()*1e6)}.db`
import { describe, it, expect } from 'vitest'
import * as jwt from 'jsonwebtoken'
import { verifyToken } from '../middleware/auth'
import app from '../index'

describe('basic', () => {
  it('sanity', () => {
    expect(true).toBe(true)
  })

  it('verifyToken returns userId for valid token', () => {
    const secret = process.env.JWT_SECRET || 'super-secret-key-change-me'
    const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '7d' })
    const req = { headers: { authorization: `Bearer ${token}` } } as any
    expect(verifyToken(req)).toBe(1)
  })

  it('app is exported', () => {
    expect(app).toBeTruthy()
  })
})
