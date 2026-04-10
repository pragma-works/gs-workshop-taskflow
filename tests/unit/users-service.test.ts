import * as bcrypt from 'bcryptjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TokenService } from '../../src/auth/token-service'
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../src/errors/application-error'
import { UsersService, type UserRepository } from '../../src/services/users-service'

describe('UsersService', () => {
  const tokenService = new TokenService('unit-secret')

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('registers users without leaking password hashes', async () => {
    const createUser = vi.fn(async (input: { email: string; name: string; password: string }) => ({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      email: input.email,
      id: 1,
      name: input.name,
      password: input.password,
    }))

    const userRepository: UserRepository = {
      createUser,
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
    }

    const service = new UsersService(userRepository, tokenService)
    const user = await service.registerUser({
      email: 'user@test.com',
      name: 'User',
      password: 'password123',
    })

    expect(user.password).toBeUndefined()
    expect(createUser).toHaveBeenCalledTimes(1)
    expect(createUser.mock.calls[0][0].password).not.toBe('password123')
  })

  it('rejects duplicate registrations', async () => {
    const userRepository: UserRepository = {
      createUser: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        email: 'user@test.com',
        id: 1,
        name: 'User',
        password: 'hashed',
      }),
      findById: vi.fn(),
    }

    const service = new UsersService(userRepository, tokenService)

    await expect(
      service.registerUser({
        email: 'user@test.com',
        name: 'User',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('returns a verifiable token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    const userRepository: UserRepository = {
      createUser: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        email: 'user@test.com',
        id: 7,
        name: 'User',
        password: passwordHash,
      }),
      findById: vi.fn(),
    }

    const service = new UsersService(userRepository, tokenService)
    const result = await service.loginUser({
      email: 'user@test.com',
      password: 'password123',
    })

    expect(tokenService.verify(result.token).userId).toBe(7)
  })

  it('rejects invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 10)
    const userRepository: UserRepository = {
      createUser: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({
        createdAt: new Date(),
        email: 'user@test.com',
        id: 7,
        name: 'User',
        password: passwordHash,
      }),
      findById: vi.fn(),
    }

    const service = new UsersService(userRepository, tokenService)

    await expect(
      service.loginUser({
        email: 'user@test.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws when a requested user does not exist', async () => {
    const userRepository: UserRepository = {
      createUser: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
    }

    const service = new UsersService(userRepository, tokenService)

    await expect(service.getUserById(10)).rejects.toBeInstanceOf(NotFoundError)
  })
})
