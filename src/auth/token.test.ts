import { describe, expect, it } from 'vitest'
import { AppError } from '../errors/app-error'
import { signAuthToken, verifyAuthToken } from './token'

describe('auth token helpers', () => {
  it('signs and verifies token from env secret', () => {
    process.env.JWT_SECRET = 'test-secret'

    const token = signAuthToken(7)
    const userId = verifyAuthToken(`Bearer ${token}`)

    expect(userId).toBe(7)
  })

  it('throws unauthorized for invalid token', () => {
    process.env.JWT_SECRET = 'test-secret'

    expect(() => verifyAuthToken('Bearer invalid')).toThrow(AppError)
  })

  it('throws unauthorized when auth header is missing', () => {
    process.env.JWT_SECRET = 'test-secret'

    expect(() => verifyAuthToken(undefined)).toThrow(AppError)
  })
})
