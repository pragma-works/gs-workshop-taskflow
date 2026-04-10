import { describe, expect, it, vi } from 'vitest'
import { NotFoundError, UnauthorizedError } from '../errors'
import { getUserById, loginUser, registerUser } from './user-service'

describe('user service', () => {
  it('registers a user with a hashed password and returns a sanitized result', async () => {
    const hashPassword = vi.fn().mockResolvedValue('hashed-password')
    const createUser = vi.fn().mockResolvedValue({
      id: 1,
      email: 'alice@test.com',
      password: 'hashed-password',
      name: 'Alice',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
    })

    const result = await registerUser('alice@test.com', 'password123', 'Alice', {
      userRepository: {
        createUser,
        findUserByEmail: vi.fn(),
        findUserById: vi.fn(),
      },
      hashPassword,
      comparePassword: vi.fn(),
      signToken: vi.fn(),
    })

    expect(hashPassword).toHaveBeenCalledWith('password123', 10)
    expect(createUser).toHaveBeenCalledWith({
      email: 'alice@test.com',
      password: 'hashed-password',
      name: 'Alice',
    })
    expect(result).toEqual({
      id: 1,
      email: 'alice@test.com',
      name: 'Alice',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
    })
  })

  it('rejects login when the user does not exist', async () => {
    await expect(loginUser('alice@test.com', 'password123', {
      userRepository: {
        createUser: vi.fn(),
        findUserByEmail: vi.fn().mockResolvedValue(null),
        findUserById: vi.fn(),
      },
      hashPassword: vi.fn(),
      comparePassword: vi.fn(),
      signToken: vi.fn(),
    })).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('returns a signed token when the credentials are valid', async () => {
    const comparePassword = vi.fn().mockResolvedValue(true)
    const signToken = vi.fn().mockReturnValue('signed-token')

    const result = await loginUser('alice@test.com', 'password123', {
      userRepository: {
        createUser: vi.fn(),
        findUserByEmail: vi.fn().mockResolvedValue({
          id: 1,
          email: 'alice@test.com',
          password: 'hashed-password',
          name: 'Alice',
          createdAt: new Date(),
        }),
        findUserById: vi.fn(),
      },
      hashPassword: vi.fn(),
      comparePassword,
      signToken,
    })

    expect(comparePassword).toHaveBeenCalledWith('password123', 'hashed-password')
    expect(signToken).toHaveBeenCalledWith(1)
    expect(result).toEqual({ token: 'signed-token' })
  })

  it('throws when the requested user does not exist', async () => {
    await expect(getUserById(999, {
      userRepository: {
        createUser: vi.fn(),
        findUserByEmail: vi.fn(),
        findUserById: vi.fn().mockResolvedValue(null),
      },
      hashPassword: vi.fn(),
      comparePassword: vi.fn(),
      signToken: vi.fn(),
    })).rejects.toBeInstanceOf(NotFoundError)
  })
})