import type { Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadEnvironment } from '../../src/config/environment'
import { createPrismaClient } from '../../src/db'
import { errorHandler, notFoundHandler } from '../../src/routes/error-handler'

describe('runtime wiring and error handlers', () => {
  afterEach(() => {
    vi.resetModules()
    delete process.env.JWT_SECRET
    delete process.env.PORT
    delete process.env.DATABASE_URL
  })

  it('loads environment defaults and validates required settings', () => {
    expect(
      loadEnvironment({
        JWT_SECRET: 'runtime-secret',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      jwtSecret: 'runtime-secret',
      port: 3001,
    })

    expect(() => loadEnvironment({} as NodeJS.ProcessEnv)).toThrowError('JWT_SECRET is required')
    expect(
      () =>
        loadEnvironment({
          JWT_SECRET: 'runtime-secret',
          PORT: 'abc',
        } as NodeJS.ProcessEnv),
    ).toThrowError('PORT must be a positive integer')
  })

  it('creates a prisma client instance', async () => {
    const prismaClient = createPrismaClient()

    expect(typeof prismaClient.$disconnect).toBe('function')
    await prismaClient.$disconnect()
  })

  it('builds the production app module when environment is present', async () => {
    process.env.JWT_SECRET = 'runtime-secret'
    process.env.DATABASE_URL = 'file:./tests/.tmp/runtime-index.db'
    process.env.PORT = '3100'

    const module = await import('../../src/index')

    expect(module.default).toBeDefined()
  })

  it('returns JSON for not found and unexpected errors', () => {
    const response = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    } as unknown as Response

    notFoundHandler({} as Request, response, vi.fn())
    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({ error: 'Not found' })

    errorHandler(new Error('boom'), {} as Request, response, vi.fn())
    expect(response.status).toHaveBeenCalledWith(500)
    expect(response.json).toHaveBeenCalledWith({ error: 'Internal server error' })
  })
})
