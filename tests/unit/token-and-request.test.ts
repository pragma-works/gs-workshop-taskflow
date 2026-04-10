import type { Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'
import { TokenService } from '../../src/auth/token-service'
import { BadRequestError, UnauthorizedError } from '../../src/errors/application-error'
import {
  authenticateRequest,
  getAuthenticatedUserId,
} from '../../src/middleware/authenticate-request'
import {
  parseIntegerParameter,
  optionalInteger,
  optionalString,
  requireNonEmptyString,
} from '../../src/routes/request-parsing'

describe('TokenService and request guards', () => {
  it('signs and verifies JWT payloads', () => {
    const tokenService = new TokenService('unit-secret')
    const token = tokenService.sign(42)

    expect(tokenService.verify(token).userId).toBe(42)
  })

  it('rejects tokens without a numeric user id payload', () => {
    const tokenService = new TokenService('unit-secret')
    const invalidToken = jwt.sign({ sub: 'user-1' }, 'unit-secret')

    expect(() => tokenService.verify(invalidToken)).toThrow(UnauthorizedError)
  })

  it('rejects missing bearer headers', () => {
    const tokenService = new TokenService('unit-secret')
    const middleware = authenticateRequest(tokenService)
    const next = vi.fn()
    const request = { headers: {} } as unknown as Request

    middleware(request, {} as Response, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError)
  })

  it('rejects empty bearer tokens', () => {
    const tokenService = new TokenService('unit-secret')
    const middleware = authenticateRequest(tokenService)
    const next = vi.fn()
    const request = {
      headers: { authorization: 'Bearer   ' },
    } as unknown as Request

    middleware(request, {} as Response, next)

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError)
  })

  it('stores the authenticated user id on the request', () => {
    const tokenService = new TokenService('unit-secret')
    const middleware = authenticateRequest(tokenService)
    const next = vi.fn()
    const request = {
      headers: { authorization: `Bearer ${tokenService.sign(15)}` },
    } as unknown as Request

    middleware(request, {} as Response, next)

    expect(next).toHaveBeenCalledWith()
    expect(getAuthenticatedUserId(request)).toBe(15)
  })

  it('throws when auth middleware did not set a user id', () => {
    expect(() => getAuthenticatedUserId({} as Request)).toThrow(UnauthorizedError)
  })

  it('rejects invalid integer route parameters', () => {
    expect(() => parseIntegerParameter('abc', 'cardId')).toThrow(BadRequestError)
  })

  it('rejects blank required strings', () => {
    expect(() => requireNonEmptyString('   ', 'name')).toThrowError('Invalid name')
  })

  it('normalizes optional request fields', () => {
    expect(optionalString('  notes  ', 'description')).toBe('notes')
    expect(optionalString('   ', 'description')).toBeUndefined()
    expect(optionalInteger(4, 'position')).toBe(4)
    expect(optionalInteger(undefined, 'position')).toBeUndefined()
  })
})
