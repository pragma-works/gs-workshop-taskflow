import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db', () => ({
  default: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '../db'
import { createUser, findUserByEmail, findUserById } from './userService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createUser', () => {
  it('creates user via prisma with select that omits password', async () => {
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice', createdAt: new Date('2024-01-01') }
    vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser as any)

    const result = await createUser('a@b.com', 'hashed-pw', 'Alice')

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', password: 'hashed-pw', name: 'Alice' },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    expect(result).toEqual(mockUser)
    // password must not be in the returned object
    expect('password' in result).toBe(false)
  })

  it('returns the exact fields: id, email, name, createdAt', async () => {
    const mockUser = { id: 5, email: 'x@y.com', name: 'Bob', createdAt: new Date('2025-06-01') }
    vi.mocked(prisma.user.create).mockResolvedValueOnce(mockUser as any)

    const result = await createUser('x@y.com', 'pw', 'Bob')

    expect(result.id).toBe(5)
    expect(result.email).toBe('x@y.com')
    expect(result.name).toBe('Bob')
    expect(result.createdAt).toEqual(new Date('2025-06-01'))
  })
})

describe('findUserByEmail', () => {
  it('returns the full user record including password for auth', async () => {
    const mockUser = { id: 2, email: 'u@v.com', name: 'Carol', password: 'hash', createdAt: new Date() }
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await findUserByEmail('u@v.com')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'u@v.com' } })
    expect(result).toEqual(mockUser)
    expect(result?.password).toBe('hash')
  })

  it('returns null when user is not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const result = await findUserByEmail('no@one.com')

    expect(result).toBeNull()
  })
})

describe('findUserById', () => {
  it('returns user without password field', async () => {
    const mockUser = { id: 3, email: 'p@q.com', name: 'Dave', createdAt: new Date('2024-05-01') }
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(mockUser as any)

    const result = await findUserById(3)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    expect(result).toEqual(mockUser)
    expect(result && 'password' in result).toBe(false)
  })

  it('returns null when user is not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

    const result = await findUserById(999)

    expect(result).toBeNull()
  })
})
